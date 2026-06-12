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
  // 直接取查询者激活 gs 账号的 ck（与 /uid 勾选一致）；多 ck 下比 getMysInfo 的 uid 解析更稳
  let user = e.user || e.runtime?.user
  let ck = user?.getMysUser?.('gs')?.ck || Object.values(user?.mysUsers || {})[0]?.ck
  if (!ck) {
    let mys = await MysApi.init(e, 'cookie') // 兜底：旧版 runtime
    ck = mys?.ck
  }
  if (!ck) {
    e.reply('请先绑定米游社Cookie（与原神共用，发送【#绑定cookie】查看教程）')
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
      icon: a.sec_part_icon || a.icon_path || a.half_length_icon_path,
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
  let ultraTier = abyssTierByIcon(ue.level_icon) || abyssTierByLevel(ue.group_level)
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

// 超弦空间段位名（米游社五档：禁忌→原罪→苦痛→红莲→寂灭；红莲/寂灭外各分 I/II/III）
const ABYSS_MEDAL = { 1: '禁忌', 2: '原罪', 3: '苦痛', 4: '红莲', 5: '寂灭' }
// level_icon 形如 .../TheAbyssMedal04.png —— 奖章号即权威段位，优先用它
function abyssTierByIcon (url) {
  let m = /TheAbyssMedal0?(\d+)/.exec(url || '')
  return m ? (ABYSS_MEDAL[Number(m[1])] || '') : ''
}
// 仅有 group_level 时的兜底映射（本号实测 8/9 = 红莲/Medal04 为锚点）
function abyssTierByLevel (lv) {
  lv = Number(lv) || 0
  if (lv <= 2) return '禁忌'
  if (lv <= 4) return '原罪'
  if (lv <= 7) return '苦痛'
  if (lv <= 10) return '红莲'
  return '寂灭'
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
  let na = idx?.data?.stats?.new_abyss || {}
  let ue = note?.data?.ultra_endless || {}
  let tierName = abyssTierByIcon(ue.level_icon) || abyssTierByLevel(ue.group_level ?? na.level)
  let cells = [
    { k: '超弦段位', v: tierName || ('Lv' + (ue.group_level ?? na.level ?? 0)) },
    { k: '挑战分数', v: ue.challenge_score ?? 0 },
    { k: '奖杯数', v: na.cup_number ?? 0 }
  ]
  let reports = (res.data?.reports || []).map(rp => ({
    boss: rp.boss?.avatar,
    bossName: rp.boss?.name,
    score: rp.score,
    tier: abyssTierByLevel(rp.level),
    level: rp.level,
    rank: rp.rank,
    cup: rp.cup_number,
    cupChange: rp.settled_cup_number,
    date: rp.updated_time_second ? new Date(rp.updated_time_second * 1000).toISOString().slice(5, 10).replace('-', '.') : '',
    lineup: (rp.lineup || []).map(v => ({ name: v.name, icon: v.sec_part_icon, star: v.star }))
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
  bh3NewAbyss: { name: '崩三超弦空间', desc: '查询超弦空间数据', rule: /^(!|！)超弦空间$/, fn: bh3Abyss },
  bh3Battle: { name: '崩三记忆战场', desc: '查询记忆战场数据', rule: /^(!|！)记忆战场$/, fn: bh3Battle },
  bh3Weekly: { name: '崩三周报', desc: '一周成绩单查询', rule: /^(!|！)周报$/, fn: bh3Weekly },
  bh3Crystal: { name: '崩三水晶', desc: '查看水晶月历数据', rule: /^(!|！)水晶$/, fn: bh3Crystal },
  bh3CrystalYear: { name: '崩三今年水晶统计', desc: '查看水晶今年数据', rule: /^(!|！)今年水晶统计$/, fn: bh3CrystalYear }
})

export default app
