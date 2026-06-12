import crypto from 'node:crypto'

/*
 * 崩坏三(bh3) 米游社战绩接口轻客户端
 * 自包含：仅复用账号已绑定的共享 cookie，自行做 DS 签名 + 请求，
 * 不依赖原神插件内部文件，便于喵喵 fork 同步上游。
 * 接口名参考社区实现 chingkingm/honkai_mys。
 */

const HOST_RECORD = 'https://api-takumi-record.mihoyo.com'
const HOST_TAKUMI = 'https://api-takumi.mihoyo.com'
const HOST_FINANCE = 'https://api.mihoyo.com'
// 国服 DS salt（与原神插件 cn 一致）
const CN_SALT = 'xV8v4Qu54lUKrEYFZkJhB8cuOh9Asafs'
// 与原神插件国服 record 一致的已验证组合
const APP_VERSION = '2.40.1'
const HOST_FP = 'https://public-data-api.mihoyo.com'

const md5 = (s) => crypto.createHash('md5').update(String(s)).digest('hex')

const guid = () => {
  const S4 = () => (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
  return `${S4()}${S4()}-${S4()}-${S4()}-${S4()}-${S4()}${S4()}${S4()}`
}

const seed = (len = 16) => {
  const c = '0123456789abcdef'
  let r = ''
  for (let i = 0; i < len; i++) r += c[Math.floor(Math.random() * 16)]
  return r
}

export default class Bh3Api {
  /**
   * @param cookie 米游社 cookie（任意游戏已绑定的即可，账号共享）
   * @param option.uid 崩三 uid（可不传，getRoles 自动解析）
   * @param option.region 崩三区服（同上）
   * @param option.log 是否打印日志
   */
  constructor (cookie, option = {}) {
    this.cookie = cookie
    this.uid = option.uid || ''
    this.region = option.region || ''
    this.log = option.log !== false
    this.deviceId = guid()
  }

  getDs (q = '', b = '') {
    const t = Math.round(Date.now() / 1000)
    const r = Math.floor(Math.random() * 900000 + 100000)
    const ds = md5(`salt=${CN_SALT}&t=${t}&r=${r}&b=${b}&q=${q}`)
    return `${t},${r},${ds}`
  }

  getHeaders (query = '', body = '') {
    const h = {
      'x-rpc-app_version': APP_VERSION,
      'x-rpc-client_type': '5',
      'User-Agent': `Mozilla/5.0 (Linux; Android 12; ${this.deviceId}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.73 Mobile Safari/537.36 miHoYoBBS/${APP_VERSION}`,
      Referer: 'https://webstatic.mihoyo.com/',
      DS: this.getDs(query, body),
      Cookie: this.cookie
    }
    // record 接口要求合法 device_fp（getFp 握手获取）；getFp 自身请求时 _fp 尚未就绪，不带，避免递归
    if (this._fp) h['x-rpc-device_fp'] = this._fp
    return h
  }

  /** 获取合法 device_fp（参考原神插件国服 getFp 握手），缓存于 this._fp */
  async getFp () {
    if (this._fp !== undefined) return this._fp
    const deviceId = this.deviceId.toUpperCase()
    const body = {
      seed_id: seed(16),
      device_id: deviceId,
      platform: '1',
      seed_time: Date.now() + '',
      ext_fields: `{"proxyStatus":"0","accelerometer":"-0.159515x-0.830887x-0.682495","ramCapacity":"3746","IDFV":"${deviceId}","gyroscope":"-0.191951x-0.112927x0.632637","isJailBreak":"0","model":"iPhone12,5","ramRemain":"115","chargeStatus":"1","networkType":"WIFI","vendor":"--","osVersion":"17.0.2","batteryStatus":"50","screenSize":"414×896","cpuCores":"6","appMemory":"55","romCapacity":"488153","romRemain":"157348","cpuType":"CPU_TYPE_ARM64","magnetometer":"-84.426331x-89.708435x-37.117889"}`,
      app_name: 'bbs_cn',
      device_fp: '38d7ee834d1e9'
    }
    const res = await this.request(`${HOST_FP}/device-fp/api/getFp`, { body })
    this._fp = res?.data?.device_fp || ''
    logger?.mark?.(`[崩三][getFp] ${this._fp ? 'ok ' + this._fp : 'fail retcode=' + res?.retcode}`)
    return this._fp
  }

  /** 通用请求；body 为对象则走 POST */
  async request (url, { query = '', body = '' } = {}) {
    const full = query ? `${url}?${query}` : url
    const bodyStr = body ? JSON.stringify(body) : ''
    const headers = this.getHeaders(query, bodyStr)
    const opt = { method: bodyStr ? 'POST' : 'GET', headers, timeout: 10000 }
    if (bodyStr) opt.body = bodyStr
    const start = Date.now()
    let res
    try {
      const resp = await fetch(full, opt)
      res = await resp.json()
    } catch (err) {
      logger?.error?.(`[崩三接口][${url}] ${err}`)
      return false
    }
    if (this.log) logger?.mark?.(`[崩三接口][${this.uid || '-'}] ${url.split('/api/')[1] || url} ${Date.now() - start}ms retcode=${res?.retcode}`)
    return res
  }

  /** 用 cookie 解析该账号下的崩三角色（uid+区服），命中后写入 this.uid/this.region */
  async getRoles () {
    const res = await this.request(`${HOST_TAKUMI}/binding/api/getUserGameRolesByCookie`, { query: 'game_biz=bh3_cn' })
    if (!res || res.retcode !== 0) return res
    // game_biz=bh3_cn 已限定为崩三国服角色；多角色取等级最高的
    const list = res.data?.list || []
    if (!list.length) return res
    const role = [...list].sort((a, b) => (b.level || 0) - (a.level || 0))[0]
    this.uid = role.game_uid
    this.region = role.region
    this.roleInfo = role
    logger?.mark?.(`[崩三][角色解析] uid=${this.uid} region=${this.region} nick=${role.nickname} lv=${role.level}`)
    return res
  }

  /** honkai3rd 战绩接口通用 GET */
  async record (type) {
    if (!this.uid || !this.region) {
      const roles = await this.getRoles()
      if (!this.uid || !this.region) return roles
    }
    await this.getFp()
    // 参数顺序对齐原神插件已验证的 GET 写法（role_id 在前），server 在前会被判 invalid request
    const query = `role_id=${this.uid}&server=${this.region}`
    return this.request(`${HOST_RECORD}/game_record/app/honkai3rd/api/${type}`, { query })
  }

  getIndex () { return this.record('index') }           // 总览（含体力等）
  getCharacters () { return this.record('characters') } // 角色列表
  getGodWar () { return this.record('godWar') }         // 往世乐土
  getNewAbyss () { return this.record('newAbyssReport') } // 超弦空间
  getBattleField () { return this.record('battleFieldReport') } // 记忆战场
  getWeekly () { return this.record('weeklyReport') }   // 周报

  /** 水晶/星石 财务接口（bh3-weekly_finance，host=api.mihoyo.com） */
  async finance (path, extra = '') {
    if (!this.uid || !this.region) {
      const roles = await this.getRoles()
      if (!this.uid || !this.region) return roles
    }
    await this.getFp()
    const query = `${extra ? extra + '&' : ''}game_biz=bh3_cn&bind_uid=${this.uid}&bind_region=${this.region}`
    return this.request(`${HOST_FINANCE}/bh3-weekly_finance/api/${path}`, { query })
  }

  getCrystal () { return this.finance('index') }                 // 本月水晶月历
  getCrystalLastMonth () { return this.finance('getLastMonthInfo') } // 上月
  getHcoinRecords () { return this.finance('getHcoinRecords', 'page=1&limit=20') } // 水晶明细
}
