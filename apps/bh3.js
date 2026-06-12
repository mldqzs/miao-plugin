import fs from 'node:fs'
import { App, Common } from '#miao'
import { MysApi, Bh3Api } from '#miao.models'

let app = App.init({
  id: 'bh3',
  name: '崩坏三'
})

/**
 * 取崩三接口客户端：复用账号已绑定的共享 cookie（与原神/星铁共用），
 * 自动解析该账号下的崩三 uid+区服。失败时已自行回复并返回 false。
 */
// 统一出图（scale 1.4）；页脚 fork & 小青 已在全局 Render.js 处理
function bh3Render (e, tpl, params) {
  return Common.render(tpl, params, { e, scale: 1.4 })
}

async function getBh3Api (e) {
  let mys = await MysApi.init(e, 'cookie')
  if (!mys || !mys.ck) {
    e.reply('请先绑定米游社Cookie（与原神共用，发送【#绑定cookie】查看教程）')
    return false
  }
  let api = new Bh3Api(mys.ck)
  await api.getRoles()
  if (!api.uid || !api.region) {
    e.reply('未查询到该账号下的崩坏三角色，请确认米游社战绩已公开')
    return false
  }
  return api
}

/** 统一校验接口返回 */
function checkRet (e, res) {
  if (!res) {
    e.reply('崩三接口无响应，请稍后再试')
    return false
  }
  if (res.retcode !== 0) {
    e.reply(`查询失败：${res.message || '未知错误'}（retcode=${res.retcode}）`)
    return false
  }
  return true
}

/** 开发期：完整响应结构 dump 到 /tmp，便于据真实结构做出图 */
function dumpData (key, uid, data) {
  try {
    fs.writeFileSync(`/tmp/bh3_${key}.json`, JSON.stringify(data, null, 2))
  } catch (err) {
    logger?.error?.(`[崩三][dump][${key}] ${err}`)
  }
}

// 2.1 !角色 —— 喵喵风格出图
async function bh3Character (e) {
  let api = await getBh3Api(e)
  if (!api) return true
  let res = await api.getCharacters()
  if (!checkRet(e, res)) return true
  dumpData('character', api.uid, res.data)
  let r = api.roleInfo || {}
  return await bh3Render(e, 'bh3/character', {
    uid: api.uid,
    nickname: r.nickname || '',
    level: r.level || '',
    chars: mapChars(res)
  }, { e, scale: 1.4 })
}

// 角色数据 → 模板 chars 数组（!角色 与 !武器 共用）
function mapChars (res) {
  return (res.data?.characters || []).map(c => {
    let a = c?.character?.avatar || {}
    return {
      name: a.name,
      icon: a.half_length_icon_path || a.icon_path || a.image_path,
      level: a.level,
      star: a.star,
      elem: a.oblique_avatar_background_path,
      weapon: c?.character?.weapon,
      stigmatas: c?.character?.stigmatas || []
    }
  })
}

// 2.2 !武器 —— 女武神装备（崩三无武器背包接口，展示各女武神已装备武器+圣痕）
async function bh3Weapon (e) {
  let api = await getBh3Api(e)
  if (!api) return true
  let res = await api.getCharacters()
  if (!checkRet(e, res)) return true
  dumpData('weapon', api.uid, res.data)
  let r = api.roleInfo || {}
  return await bh3Render(e, 'bh3/weapon', {
    uid: api.uid,
    nickname: r.nickname || '',
    level: r.level || '',
    chars: mapChars(res)
  }, { e, scale: 1.4 })
}

// 2.3 !体力 —— 账号总览（崩三战绩无实时体力字段，index 返回账号总览）
async function bh3Note (e) {
  let api = await getBh3Api(e)
  if (!api) return true
  let res = await api.getIndex()
  if (!checkRet(e, res)) return true
  dumpData('note', api.uid, res.data)
  let d = res.data || {}
  return await bh3Render(e, 'bh3/index', {
    uid: api.uid,
    role: d.role || {},
    stats: { new_abyss: {}, ...(d.stats || {}) },
    preference: d.preference || {},
    bg: d.head_background
  }, { e, scale: 1.4 })
}

// 3.3 !往世乐土
async function bh3GodWar (e) {
  let api = await getBh3Api(e)
  if (!api) return true
  let res = await api.getGodWar()
  if (!checkRet(e, res)) return true
  dumpData('godWar', api.uid, res.data)
  let d = res.data || {}
  let collections = (d.collections || []).map(c => ({
    ...c,
    pct: Math.min(100, Math.round((c.collected_number / (c.total_number || 1)) * 100))
  }))
  let avatars = (d.avatar_transcript || []).map(t => ({
    name: t.avatar?.name,
    icon: t.avatar?.icon_path,
    star: t.avatar?.star,
    level: t.level,
    score: t.max_challenge_score
  }))
  let r = api.roleInfo || {}
  return await bh3Render(e, 'bh3/godwar', {
    uid: api.uid,
    nickname: r.nickname || '',
    level: r.level || '',
    summary: d.summary || {},
    collections,
    avatars
  }, { e, scale: 1.4 })
}

// 3.4 !周报 —— 一周成绩单
async function bh3Weekly (e) {
  let api = await getBh3Api(e)
  if (!api) return true
  let res = await api.getWeekly()
  if (!checkRet(e, res)) return true
  dumpData('weekly', api.uid, res.data)
  let d = res.data || {}
  let fc = d.favorite_character
  let fav = fc ? {
    name: fc.avatar?.name || fc.name,
    icon: fc.avatar?.half_length_icon_path || fc.avatar?.icon_path || fc.icon,
    star: fc.avatar?.star || fc.star
  } : null
  let r = api.roleInfo || {}
  return await bh3Render(e, 'bh3/weekly', {
    uid: api.uid, nickname: r.nickname || '', level: r.level || '', w: d, fav
  }, { e, scale: 1.4 })
}

// 3.1 !记忆战场
async function bh3Battle (e) {
  let api = await getBh3Api(e)
  if (!api) return true
  let idx = await api.getIndex()
  let rep = await api.getBattleField()
  if (!checkRet(e, rep)) return true
  dumpData('battle', api.uid, rep.data)
  let s = idx?.data?.stats || {}
  let cells = [
    { k: '战场积分', v: s.battle_field_score ?? 0 },
    { k: '战场排名', v: s.battle_field_rank ?? 0 },
    { k: '战场区域', v: s.battle_field_area ?? 0 },
    { k: '排名百分比', v: s.battle_field_ranking_percentage || '—' }
  ]
  let reports = rep.data?.reports || []
  let r = api.roleInfo || {}
  return await bh3Render(e, 'bh3/report', {
    title: '记忆战场', uid: api.uid, nickname: r.nickname || '', level: r.level || '',
    cells, empty: reports.length === 0, emptyMsg: '本期暂无记忆战场记录'
  }, { e, scale: 1.4 })
}

// 3.2 !超弦空间
async function bh3Abyss (e) {
  let api = await getBh3Api(e)
  if (!api) return true
  let idx = await api.getIndex()
  let rep = await api.getNewAbyss()
  if (!checkRet(e, rep)) return true
  dumpData('newAbyss', api.uid, rep.data)
  let na = idx?.data?.stats?.new_abyss || {}
  let cells = [
    { k: '当前段位', v: 'Lv' + (na.level ?? 0) },
    { k: '奖杯数', v: na.cup_number ?? 0 }
  ]
  let detail = rep.data || {}
  let hasData = (detail.reports?.length || detail.records?.length || 0) > 0
  let r = api.roleInfo || {}
  return await bh3Render(e, 'bh3/report', {
    title: '超弦空间', uid: api.uid, nickname: r.nickname || '', level: r.level || '',
    cells, empty: !hasData, emptyMsg: '本期暂无超弦空间记录'
  }, { e, scale: 1.4 })
}

// 4.1 !水晶 —— 水晶月历（finance index）
async function bh3Crystal (e) {
  let api = await getBh3Api(e)
  if (!api) return true
  let res = await api.getCrystal()
  if (!checkRet(e, res)) return true
  dumpData('crystal', api.uid, res.data)
  let r = api.roleInfo || {}
  return await bh3Render(e, 'bh3/crystal', {
    uid: api.uid, nickname: r.nickname || '', d: res.data || {}
  }, { e, scale: 1.4 })
}

// 4.2 !今年水晶统计 —— 本月/上月概览 + 明细（崩三无"今年"聚合接口，明细按月分页，空则空状态）
async function bh3CrystalYear (e) {
  let api = await getBh3Api(e)
  if (!api) return true
  let idx = await api.getCrystal()
  let rec = await api.getHcoinRecords()
  if (!checkRet(e, rec)) return true
  dumpData('crystalRecords', api.uid, rec.data)
  let d = idx?.data || {}
  let cells = [
    { k: '本月水晶', v: d.month_hcoin ?? 0 },
    { k: '本月星石', v: d.month_star ?? 0 },
    { k: '上月水晶', v: d.last_hcoin ?? 0 },
    { k: '上月星石', v: d.last_star ?? 0 }
  ]
  let list = rec.data?.list || []
  let r = api.roleInfo || {}
  return await bh3Render(e, 'bh3/report', {
    title: '水晶统计', uid: api.uid, nickname: r.nickname || '', level: r.level || '',
    cells, empty: list.length === 0, emptyMsg: '暂无水晶明细记录'
  })
}

// 注：!uid 不在此注册——已整合进原神插件 /uid 出图（showUid 正则加了 ! 前缀）

app.reg({
  bh3Character: { name: '崩三角色', desc: '查询崩坏三角色列表', rule: /^(!|！)角色$/, fn: bh3Character },
  bh3Weapon: { name: '崩三武器', desc: '查询崩坏三女武神装备', rule: /^(!|！)武器$/, fn: bh3Weapon },
  bh3Note: { name: '崩三总览', desc: '查询崩坏三账号总览', rule: /^(!|！)(总览|体力)$/, fn: bh3Note },
  bh3GodWar: { name: '崩三往世乐土', desc: '查询往世乐土数据', rule: /^(!|！)往世乐土$/, fn: bh3GodWar },
  bh3NewAbyss: { name: '崩三超弦空间', desc: '查询超弦空间数据', rule: /^(!|！)超弦空间$/, fn: bh3Abyss },
  bh3Battle: { name: '崩三记忆战场', desc: '查询记忆战场数据', rule: /^(!|！)记忆战场$/, fn: bh3Battle },
  bh3Weekly: { name: '崩三周报', desc: '一周成绩单查询', rule: /^(!|！)周报$/, fn: bh3Weekly },
  bh3Crystal: { name: '崩三水晶', desc: '查看水晶月历数据', rule: /^(!|！)水晶$/, fn: bh3Crystal },
  bh3CrystalYear: { name: '崩三今年水晶统计', desc: '查看水晶今年数据', rule: /^(!|！)今年水晶统计$/, fn: bh3CrystalYear }
})

export default app
