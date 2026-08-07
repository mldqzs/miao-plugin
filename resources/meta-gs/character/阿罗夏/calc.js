export const details = [
  {
    title: 'E点按伤害',
    dmg: ({}, dmg) => dmg(609.3, 'e')
  },
  {
    title: 'E长按伤害',
    dmg: ({}, dmg) => dmg(761.6, 'e')
  },
  {
    title: 'Q轰霆猎场伤害',
    dmg: ({}, dmg) => dmg(159.3, 'q')
  },
  {
    title: 'Q图加林伤害',
    dmg: ({}, dmg) => dmg(106.7, 'q')
  },
  {
    title: '单人星超导伤害',
    params: { Stellar: true },
    dmg: ({}, { reaction }) => reaction('stellarConduct')
  }
]

export const defDmgIdx = 3
export const mainAttr = 'atk,cpct,cdmg,recharge,mastery'

export const buffs = [
  {
    title: '阿罗夏E：猎者之准攻击力提升[atkPct]%',
    data: {
      atkPct: 25
    }
  },
  {
    check: ({ params }) => params.Stellar === true,
    title: '阿罗夏天赋：猎者之准使场上角色造成的星超导反应伤害提升[stellarConduct]%',
    data: {
      stellarConduct: 20
    }
  },
  {
    title: '阿罗夏天赋：基于元素充能效率，元素战技与元素爆发伤害提升[dmg]%',
    sort: 9,
    data: {
      dmg: ({ attr, calc }) => Math.min(calc(attr.recharge) * 0.35, 70)
    }
  },
  {
    title: '阿罗夏6命：猎者之准2层时元素精通提升[mastery]点',
    cons: 6,
    data: {
      mastery: 100
    }
  }
]

export const createdBy = '小青模拟'
