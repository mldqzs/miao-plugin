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
  return Common.render(tpl, { path: '/tmp/bh3_render.png', ...params }, { e, scale: 1.4 })
}

async function getBh3Api (e) {
  // 支持 @他人 查询：被 @ 时取被 @ 用户绑定的 ck，否则取查询者自己的
  let atQQ = e.at && String(e.at) !== String(e.user_id) ? e.at : null
  let user = e.user || e.runtime?.user
  if (atQQ) {
    let NoteUser = e.runtime?.NoteUser
    let atUser = NoteUser ? await NoteUser.create(atQQ).catch(() => null) : null
    if (atUser) user = atUser
  }
  // 直接取（被 @）用户激活 gs 账号的 ck（与 /uid 勾选一致）；多 ck 下比 getMysInfo 的 uid 解析更稳
  let ck = user?.getMysUser?.('gs')?.ck || Object.values(user?.mysUsers || {})[0]?.ck
  if (!ck && !atQQ) {
    let mys = await MysApi.init(e, 'cookie') // 兜底：旧版 runtime（仅自查）
    ck = mys?.ck
  }
  if (!ck) {
    e.reply(atQQ ? 'TA还没有绑定米游社Cookie' : '请先绑定米游社Cookie（与原神共用，发送【#绑定cookie】查看教程）')
    return false
  }
  let api = new Bh3Api(ck)
  await api.getRoles()
  if (!api.uid || !api.region) {
    e.reply('未查询到该账号下的崩坏三角色，请确认米游社战绩已公开')
    return false
  }
  return api
}

// 区服代码 → 名称：pc=全平台桌面服；安卓/iOS 保留接口原叫法；其余未知代码统称渠道服
function bh3RegionName (api) {
  let code = api?.region || ''
  if (!code) return ''
  if (/^pc/i.test(code)) return '全平台桌面服'
  if (/^android/i.test(code)) return api?.roleInfo?.region_name || '安卓国服'
  if (/^ios/i.test(code)) return api?.roleInfo?.region_name || 'iOS国服'
  return '渠道服'
}

// 段位升降 → 箭头标记（delta>0 升 / <0 降 / =0 保）
function trendMark (delta) {
  if (delta > 0) return { cls: 'up', sym: '▲', txt: '升级' }
  if (delta < 0) return { cls: 'down', sym: '▼', txt: '降级' }
  return { cls: 'flat', sym: '—', txt: '保级' }
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
  let chars = mapChars(res)
  return await bh3Render(e, 'bh3/character', {
    uid: api.uid,
    nickname: r.nickname || '',
    level: r.level || '',
    chars,
    ranks: rankStats(chars)
  })
}

// 女武神品阶：接口 star 1~5 → B/A/S/SS/SSS（可升阶后的当前品阶）
const STAR_RANK = { 1: 'B', 2: 'A', 3: 'S', 4: 'SS', 5: 'SSS' }
function starRank (star) {
  return STAR_RANK[Number(star)] || ''
}

// 角色数据 → 模板 chars 数组（!角色 与 !武器 共用）
// 按品阶降序、同阶按等级降序，方便一眼看到高阶女武神
function mapChars (res) {
  return (res.data?.characters || []).map(c => {
    let a = c?.character?.avatar || {}
    let star = Number(a.star) || 0
    return {
      name: a.name,
      icon: a.sec_part_icon || a.icon_path || a.half_length_icon_path,
      level: a.level,
      star,
      rank: starRank(star),
      elem: a.oblique_avatar_background_path,
      attrBg: a.attribute_background_path || a.avatar_background_path_v2 || '',
      chosen: !!c?.is_chosen,
      weapon: c?.character?.weapon,
      stigmatas: c?.character?.stigmatas || []
    }
  }).sort((a, b) => (b.star - a.star) || ((b.level || 0) - (a.level || 0)))
}

/** 品阶统计条（!角色 头部展示） */
function rankStats (chars) {
  let cnt = {}
  for (let c of chars || []) {
    if (!c.rank) continue
    cnt[c.rank] = (cnt[c.rank] || 0) + 1
  }
  return ['SSS', 'SS', 'S', 'A', 'B'].filter(r => cnt[r]).map(r => ({ rank: r, n: cnt[r] }))
}

// 2.2 !武器 —— 女武神装备（崩三无武器背包接口，展示各女武神已装备武器+圣痕）
async function bh3Weapon (e) {
  let api = await getBh3Api(e)
  if (!api) return true
  let res = await api.getCharacters()
  if (!checkRet(e, res)) return true
  dumpData('weapon', api.uid, res.data)
  let r = api.roleInfo || {}
  let chars = mapChars(res)
  return await bh3Render(e, 'bh3/weapon', {
    uid: api.uid,
    nickname: r.nickname || '',
    level: r.level || '',
    chars,
    ranks: rankStats(chars)
  })
}

// 2.3 !体力 —— 账号总览（崩三战绩无实时体力字段，index 返回账号总览）
async function bh3Note (e) {
  let api = await getBh3Api(e)
  if (!api) return true
  let res = await api.getIndex()
  if (!checkRet(e, res)) return true
  // 升降需对比战报，与总览并发拉取（失败不影响总览主体）
  let [abRes, bfRes] = await Promise.all([
    api.getNewAbyss().catch(() => false),
    api.getBattleField().catch(() => false)
  ])
  dumpData('note', api.uid, res.data)
  dumpData('roles', api.uid, api.roleInfo)
  let d = res.data || {}
  let st = d.stats || {}
  let na = st.new_abyss || {}
  let pf = d.preference || {}
  // 超弦空间升降：最近一期战报内 结算段位 vs 出战段位
  let abReps = abRes?.data?.reports || []
  let abyssTrend = abReps[0] ? trendMark((abReps[0].settled_level || 0) - (abReps[0].level || 0)) : null
  // 记忆战场升降：最近两期 区域(area)对比
  let bfReps = bfRes?.data?.reports || []
  let bfTrend = bfReps.length >= 2 ? trendMark((bfReps[0].area || 0) - (bfReps[1].area || 0)) : null
  // 舰长偏好（各玩法投入度 0-100）
  let prefList = [
    { k: '深渊', v: pf.abyss },
    { k: '战场', v: pf.battle_field },
    { k: '乐土', v: pf.god_war },
    { k: '主线', v: pf.main_line },
    { k: '大世界', v: pf.open_world },
    { k: '社区', v: pf.community }
  ].filter(x => x.v != null)
  return await bh3Render(e, 'bh3/index', {
    uid: api.uid,
    role: { ...(d.role || {}), region: bh3RegionName(api) },
    stats: { new_abyss: {}, ...st },
    abyssTier: resolveAbyssTier({ medalLevel: na.level }),
    bfArea: BF_AREA[st.battle_field_area] || (st.battle_field_area != null ? '区' + st.battle_field_area : '-'),
    abyssTrend,
    bfTrend,
    preference: pf,
    prefList,
    bg: d.head_background
  }, { e, scale: 1.4 })
}

// 2.3 !体力 —— 实时便签（体力 + 训练点数 + 各玩法本周进度）
async function bh3Stamina (e) {
  let api = await getBh3Api(e)
  if (!api) return true
  let res = await api.getNote()
  if (!checkRet(e, res)) return true
  dumpData('stamina', api.uid, res.data)
  let d = res.data || {}
  let t = d.stamina_recover_time || 0
  let recover = t <= 0
    ? '已回满'
    : '约 ' + (t >= 3600 ? Math.floor(t / 3600) + ' 时 ' : '') + Math.floor((t % 3600) / 60) + ' 分后回满'
  let ue = d.ultra_endless || {}
  let ultraTier = resolveAbyssTier({ icon: ue.level_icon, groupLevel: ue.group_level })
  let r = api.roleInfo || {}
  return await bh3Render(e, 'bh3/note', {
    uid: api.uid, nickname: r.nickname || '', level: r.level || '',
    recover,
    d: {
      ...d,
      ultra_endless: { ...ue, tier: ultraTier },
      battle_field: d.battle_field || {},
      god_war: d.god_war || {},
      greedy_endless: d.greedy_endless || {}
    }
  })
}

// 3.3 !往世乐土
async function bh3GodWar (e) {
  let api = await getBh3Api(e)
  if (!api) return true
  let res = await api.getGodWar()
  if (!checkRet(e, res)) return true
  dumpData('godWar', api.uid, res.data)
  let d = res.data || {}
  let rec = (d.records || [])[0]
  let record = rec ? {
    score: rec.score,
    punish_level: rec.punish_level,
    cost_time: rec.cost_time,
    main: rec.main_avatar ? { name: rec.main_avatar.name, icon: rec.main_avatar.sec_part_icon } : null,
    support: (rec.support_avatars || []).map(s => ({ name: s.name, icon: s.sec_part_icon })),
    elf: rec.elf?.avatar
  } : null
  let avatars = (d.avatar_transcript || [])
    .slice()
    .sort((a, b) => (b.max_challenge_score - a.max_challenge_score) || (b.challenge_success_times - a.challenge_success_times))
    .slice(0, 12)
    .map(t => ({ name: t.avatar?.name, icon: t.avatar?.sec_part_icon, star: t.avatar?.star, level: t.level, times: t.challenge_success_times }))
  let r = api.roleInfo || {}
  return await bh3Render(e, 'bh3/godwar', {
    uid: api.uid, nickname: r.nickname || '', level: r.level || '',
    summary: d.summary || {}, record, avatars
  })
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

// 记忆战场区名（同 qiqi-plugin levelbf）
const BF_AREA = { 1: '初级区', 2: '中级区', 3: '高级区', 4: '终极区' }

// 3.1 !记忆战场
async function bh3Battle (e) {
  let api = await getBh3Api(e)
  if (!api) return true
  let res = await api.getBattleField()
  if (!checkRet(e, res)) return true
  dumpData('battle', api.uid, res.data)
  let rep = (res.data?.reports || [])[0] || {}
  let stages = (rep.battle_infos || []).map(bi => ({
    elf: bi.elf?.avatar,
    lineup: (bi.lineup || []).map(v => ({ name: v.name, icon: v.sec_part_icon, star: v.star }))
  }))
  let r = api.roleInfo || {}
  return await bh3Render(e, 'bh3/battle', {
    uid: api.uid, nickname: r.nickname || '', level: r.level || '',
    score: rep.score ?? 0, rank: rep.rank ?? 0, pct: rep.ranking_percentage || '0',
    area: BF_AREA[rep.area] || ('区' + (rep.area ?? 0)),
    stages
  })
}

// 超弦空间段位
// - index.stats.new_abyss.level / level_icon 奖章号：大段位 1-5
// - note.ultra_endless.group_level / 战报 level：细档（含 I/II/III）
const ABYSS_MEDAL = { 1: '禁忌', 2: '原罪', 3: '苦痛', 4: '红莲', 5: '寂灭' }
const ABYSS_ROMAN = ['', 'I', 'II', 'III']

function abyssTierByMedal (lv) {
  // 大段位 1-5；米游社常显示为「原罪I」等，默认补 I（红莲/寂灭外也有细分）
  let name = ABYSS_MEDAL[Number(lv)] || ''
  if (!name) return ''
  if (name === '寂灭') return name
  return name + 'I'
}

// level_icon 形如 .../TheAbyssMedal04.png —— 奖章号即权威大段位
function abyssTierByIcon (url) {
  let m = /TheAbyssMedal0?(\d+)/.exec(url || '')
  return m ? abyssTierByMedal(m[1]) : ''
}

// group_level 细档映射（锚点：group_level 8/9 ≈ 红莲/Medal04）
// 禁忌1-2 / 原罪3-4 / 苦痛5-7 / 红莲8-10 / 寂灭11+
function abyssTierByLevel (lv) {
  lv = Number(lv) || 0
  if (lv <= 0) return ''
  let name
  let idx // 1-based sub-rank within band
  if (lv <= 2) {
    name = '禁忌'
    idx = lv
  } else if (lv <= 4) {
    name = '原罪'
    idx = lv - 2
  } else if (lv <= 7) {
    name = '苦痛'
    idx = lv - 4
  } else if (lv <= 10) {
    name = '红莲'
    idx = lv - 7
  } else {
    return '寂灭'
  }
  return name + (ABYSS_ROMAN[idx] || '')
}

/**
 * 统一解析超弦段位名
 * @param {{ icon?: string, groupLevel?: number, medalLevel?: number }} p
 * 优先：细档 group_level（带 I/II/III）> 奖章 icon > 大段位 medal(1-5)
 */
function resolveAbyssTier (p = {}) {
  let { icon, groupLevel, medalLevel } = p
  if (groupLevel != null && groupLevel !== '' && Number(groupLevel) > 0) {
    return abyssTierByLevel(groupLevel)
  }
  return abyssTierByIcon(icon) || abyssTierByMedal(medalLevel) || ''
}

// 3.2 !超弦空间
async function bh3Abyss (e) {
  let api = await getBh3Api(e)
  if (!api) return true
  let idx = await api.getIndex()
  let note = await api.getNote().catch(() => false)
  let res = await api.getNewAbyss()
  if (!checkRet(e, res)) return true
  dumpData('newAbyss', api.uid, res.data)
  if (note?.data) dumpData('stamina', api.uid, note.data)
  let na = idx?.data?.stats?.new_abyss || {}
  let ue = note?.data?.ultra_endless || {}
  // note.group_level 为细档；index.new_abyss.level 仅为大段位 1-5，不可走细档映射
  let tierName = resolveAbyssTier({
    icon: ue.level_icon,
    groupLevel: ue.group_level,
    medalLevel: na.level
  })
  let cells = [
    { k: '超弦段位', v: tierName || ('Lv' + (ue.group_level ?? na.level ?? 0)) },
    { k: '挑战分数', v: ue.challenge_score ?? 0 },
    { k: '奖杯数', v: na.cup_number ?? 0 }
  ]
  let reports = (res.data?.reports || []).map(rp => ({
    boss: rp.boss?.avatar,
    bossName: rp.boss?.name,
    score: rp.score,
    // 战报 level 为细档；同时兼容误传 1-5 大段位
    tier: abyssTierByLevel(rp.level) || abyssTierByMedal(rp.level),
    level: rp.level,
    rank: rp.rank,
    cup: rp.cup_number,
    cupChange: rp.settled_cup_number,
    date: rp.updated_time_second ? new Date(rp.updated_time_second * 1000).toISOString().slice(5, 10).replace('-', '.') : '',
    lineup: (rp.lineup || []).map(v => ({ name: v.name, icon: v.sec_part_icon, star: v.star, rank: starRank(v.star) }))
  }))
  let r = api.roleInfo || {}
  return await bh3Render(e, 'bh3/abyss', {
    uid: api.uid, nickname: r.nickname || '', level: r.level || '',
    cells, reports
  })
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
  bh3Note: { name: '崩三总览', desc: '查询崩坏三账号总览', rule: /^(!|！)总览$/, fn: bh3Note },
  bh3Stamina: { name: '崩三体力', desc: '查询体力实时便签', rule: /^(!|！)体力$/, fn: bh3Stamina },
  bh3GodWar: { name: '崩三往世乐土', desc: '查询往世乐土数据', rule: /^(!|！)往世乐土$/, fn: bh3GodWar },
  bh3NewAbyss: { name: '崩三超弦空间', desc: '查询超弦空间数据', rule: /^(!|！)(超弦空间|深渊)$/, fn: bh3Abyss },
  bh3Battle: { name: '崩三记忆战场', desc: '查询记忆战场数据', rule: /^(!|！)记忆战场$/, fn: bh3Battle },
  bh3Weekly: { name: '崩三周报', desc: '一周成绩单查询', rule: /^(!|！)周报$/, fn: bh3Weekly },
  bh3Crystal: { name: '崩三水晶', desc: '查看水晶月历数据', rule: /^(!|！)水晶$/, fn: bh3Crystal },
  bh3CrystalYear: { name: '崩三今年水晶统计', desc: '查看水晶今年数据', rule: /^(!|！)今年水晶统计$/, fn: bh3CrystalYear }
})

export default app
