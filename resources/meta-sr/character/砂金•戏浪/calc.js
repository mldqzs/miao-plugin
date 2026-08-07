export const details = [{
  title: '普攻伤害',
  dmg: ({}, dmg) => dmg(140, 'a')
}, {
  title: '战技群攻伤害',
  params: { GoodShow: true },
  dmg: ({}, dmg) => dmg(240, 'e')
}, {
  title: '战技好活当赏欢愉伤害',
  params: { GoodShow: true },
  dmg: ({}, dmg) => dmg(40, 'xe', 'elation')
}, {
  title: '终结技群攻伤害',
  params: { GoodShow: true, UltSpeed: true },
  dmg: ({}, dmg) => dmg(400, 'q')
}, {
  title: '终结技好活当赏欢愉伤害',
  params: { GoodShow: true, UltSpeed: true },
  dmg: ({}, dmg) => dmg(72, 'xe', 'elation')
}, {
  title: '举杯！敬炽烈一夏总伤害',
  params: { ElationSkill: true, tArtisBuffCount: 5 },
  dmg: ({}, dmg) => dmg(60 + 18 * 10, 'xe', 'elation')
}, {
  title: 'All in！敬炽烈一夏30热意总伤害',
  params: { ElationSkill: true, AllIn: true, Heat: 30, tArtisBuffCount: 5 },
  dmg: ({ params }, dmg) => dmg(60 + 18 * 10 + 18 * (params.Heat || 30), 'xe', 'elation')
}]

export const defDmgIdx = 6
export const defDmgKey = 'xe'
export const defParams = { ElationSkill: true, AllIn: true, Heat: 30, tArtisBuffCount: 5 }
export const mainAttr = 'atk,cpct,cdmg,speed,recharge,dmg'

export const buffs = [{
  title: '行迹-极乐派对：基于速度提高欢愉度[joy]%',
  tree: 1,
  sort: 9,
  data: {
    joy: ({ attr, calc }) => Math.min(Math.max(calc(attr.speed) - 120, 0) / 2 * 1.5 + 10, 70)
  }
}, {
  title: '行迹-纵享惊涛：单欢愉命途时欢愉技视为追加攻击'
}, {
  title: '行迹-旧梦淘金：暴击伤害提高[cdmg]%，队友行动后全队暴击伤害提高[teamCdmg]%',
  tree: 3,
  data: {
    cdmg: 36,
    teamCdmg: 24
  }
}, {
  check: ({ params }) => params.UltSpeed === true,
  title: '砂金•戏浪Q：速度提高[speedPct]%',
  data: {
    speedPct: 30
  }
}, {
  title: '砂金•戏浪1魂：全属性抗性穿透提高[kx]%',
  cons: 1,
  data: {
    kx: 20
  }
}, {
  title: '砂金•戏浪4魂：施放战技后我方全体伤害无视敌方防御[ignore]%',
  cons: 4,
  data: {
    ignore: 16
  }
}, {
  check: ({ params }) => params.ElationSkill === true,
  title: '砂金•戏浪6魂：欢愉伤害增笑[elevated]%',
  cons: 6,
  data: {
    elevated: 60
  }
}]

export const createdBy = '小青模拟'
