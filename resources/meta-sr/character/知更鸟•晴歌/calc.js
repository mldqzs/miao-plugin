const atmosphere = 50
const singerHp = ({ attr, calc }) => calc(attr.hp) * 0.7

export const details = [{
  title: '普攻伤害',
  dmg: ({ attr, calc }, { basic }) => basic(calc(attr.hp) * 0.7, 'a')
}, {
  title: '忆灵技全体伤害',
  params: { Memosprite: true, Fever: true },
  dmg: ({ attr, calc }, { basic }) => basic(singerHp({ attr, calc }) * 2.1, 'me')
}, {
  title: 'Fever满气氛忆灵技伤害',
  params: { Memosprite: true, Fever: true, FullAtmosphere: true },
  dmg: ({ attr, calc }, { basic }) => basic(singerHp({ attr, calc }) * 2.1, 'me')
}]

export const defDmgIdx = 2
export const defDmgKey = 'me'
export const defParams = { Memosprite: true, Fever: true, FullAtmosphere: true }
export const mainAttr = 'hp,cpct,cdmg,speed,recharge,dmg'

export const buffs = [{
  title: '知更鸟•晴歌天赋：晴空乐手拥有知更鸟•晴歌70%生命上限与180%速度'
}, {
  check: ({ params }) => params.Fever === true,
  title: '知更鸟•晴歌天赋：Fever结界满气氛时无视目标[ignore]%防御力',
  data: {
    ignore: 17.5 + atmosphere * 0.5
  }
}, {
  check: ({ params }) => params.Fever === true,
  title: '晴空乐手天赋：Fever满气氛时知更鸟•晴歌与晴空乐手造成的伤害提高[dmg]%',
  data: {
    dmg: 84 + atmosphere * 2.8
  }
}, {
  check: ({ params }) => params.Memosprite === true,
  title: '晴空乐手天赋：三名乐手在场时敌方全体受到的伤害提高[enemydmg]%',
  data: {
    enemydmg: 28
  }
}, {
  title: '行迹-重构谐乐：知更鸟•晴歌与晴空乐手暴击率提高[cpct]%',
  tree: 3,
  data: {
    cpct: 100
  }
}, {
  title: '行迹-偏离和弦：满气氛时我方目标暴击伤害提高[cdmg]%',
  tree: 1,
  data: {
    cdmg: 50
  }
}, {
  title: '知更鸟•晴歌2魂：我方目标全属性抗性穿透提高[kx]%',
  cons: 2,
  data: {
    kx: 20
  }
}, {
  check: ({ params }) => params.Fever === true,
  title: '知更鸟•晴歌4魂：Fever状态下晴空乐手速度提高[speedPct]%',
  cons: 4,
  data: {
    speedPct: 20 + atmosphere * 0.4
  }
}, {
  check: ({ params }) => params.Memosprite === true,
  title: '知更鸟•晴歌6魂：忆灵技伤害倍率提高[dmg]%',
  cons: 6,
  data: {
    dmg: 100
  }
}]

export const createdBy = '小青模拟'
