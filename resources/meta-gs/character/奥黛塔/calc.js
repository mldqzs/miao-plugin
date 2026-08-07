export const details = [
  {
    title: 'E技能伤害',
    dmg: ({}, dmg) => dmg(229.7, 'e')
  },
  {
    title: 'E破晓终奏持续伤害',
    dmg: ({}, dmg) => dmg(203.7, 'e')
  },
  {
    title: 'E破晓终奏星超导伤害',
    params: { Stellar: true },
    dmg: ({ attr, calc }, { basic }) => basic(calc(attr.atk) * 650 / 100, '', 'stellarConduct')
  },
  {
    title: 'E破晓终奏星扩散伤害',
    params: { Stellar: true },
    dmg: ({ attr, calc }, { basic }) => basic(calc(attr.atk) * 975 / 100, '', 'stellarConduct')
  },
  {
    title: 'E拂羽舞步伤害',
    dmg: ({}, dmg) => dmg(91.5, 'e')
  },
  {
    title: 'E拂羽舞步星超导伤害',
    params: { Stellar: true },
    dmg: ({ attr, calc }, { basic }) => basic(calc(attr.atk) * 57 / 100, '', 'stellarConduct')
  },
  {
    title: 'E旋翼舞步伤害',
    dmg: ({}, dmg) => dmg(109.4, 'e')
  },
  {
    title: 'E旋翼舞步星超导伤害',
    params: { Stellar: true },
    dmg: ({ attr, calc }, { basic }) => basic(calc(attr.atk) * 69 / 100, '', 'stellarConduct')
  },
  {
    title: 'Q斩击总伤害',
    dmg: ({}, dmg) => dmg(234.1 * 3, 'q')
  },
  {
    title: 'Q斩击最终段伤害',
    dmg: ({}, dmg) => dmg(361.8, 'q')
  },
  {
    title: '1命破晓终奏额外星超导伤害',
    params: { Stellar: true },
    cons: 1,
    dmg: ({ attr, calc }, { basic }) => basic(calc(attr.atk) * 300 / 100, '', 'stellarConduct')
  },
  {
    title: '4命协同星超导伤害',
    params: { Stellar: true },
    cons: 4,
    dmg: ({ attr, calc }, { basic }) => basic(calc(attr.atk) * 66 / 100, '', 'stellarConduct')
  }
]

export const defDmgIdx = 2
export const mainAttr = 'atk,cpct,cdmg,mastery'

export const buffs = [
  {
    title: '双冰共鸣：攻击冰元素附着或冻结状态下的敌人时，暴击率提高[cpct]%',
    data: {
      cpct: 15
    }
  },
  {
    check: ({ params }) => params.Stellar === true,
    title: '奥黛塔Q：雪鹄之梦提升星烁反应伤害[stellarConduct]%',
    data: {
      stellarConduct: 62
    }
  },
  {
    check: ({ params }) => params.Stellar === true,
    title: '奥黛塔天赋：基于攻击力超过1000的部分，星烁反应伤害提升[stellarConduct]%',
    sort: 9,
    data: {
      stellarConduct: ({ attr, calc }) => Math.min(Math.max((calc(attr.atk) - 1000) / 100 * 1.5, 0), 30)
    }
  },
  {
    check: ({ params }) => params.Stellar === true,
    title: '星耀祝礼：基于奥黛塔攻击力，提升星烁反应基础伤害[fypct]%',
    sort: 9,
    data: {
      fypct: ({ attr, calc }) => Math.min(calc(attr.atk) / 100 * 0.7, 14)
    }
  },
  {
    title: '奥黛塔2命：6层华彩时攻击力提升[atkPct]%',
    cons: 2,
    data: {
      atkPct: 7 * 6
    }
  },
  {
    title: '奥黛塔2命：独舞倒影附近敌人对应元素抗性降低[kx]%',
    cons: 2,
    data: {
      kx: 20
    }
  },
  {
    check: ({ params }) => params.Stellar === true,
    title: '奥黛塔4命：队伍其他角色星烁反应伤害提升[stellarConduct]%',
    cons: 4,
    data: {
      stellarConduct: 62 * 0.5
    }
  },
  {
    check: ({ params }) => params.Stellar === true,
    title: '奥黛塔6命：自身星烁反应伤害擢升[elevated]%',
    cons: 6,
    data: {
      elevated: 25 + 20
    }
  }
]

export const createdBy = '小青模拟'
