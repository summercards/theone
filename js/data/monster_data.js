// js/data/monster_data.js
// ------------------------------------------------------------
// 数值参数化：每个 10 级区段（1-9、11-19 … 61-69）使用同一套公式，
// Boss 独立定义，便于日后调平衡；71-77 为 Boss 车轮战。
// ------------------------------------------------------------
export const monsters = [];

const normalNames = [
  '哥布林', 'Wolf', 'Skeleton', 'Bandit', 'Slime',
  'Orc', 'Lizardman', 'Harpy', 'Shade'
];

// ★ 普通怪区段公式（共 7 段）★
// 如需调整，只需改动下方数组值即可：
//   hp = hpBase + hpPerLevel * (levelInSegment)   (levelInSegment: 0-8)
//   dmg = dmgBase + dmgPerLevel * (levelInSegment)
// cooldown 可分别设定
export const tierConfigs = [
  { hpBase: 1300,  hpPerLevel: 120, dmgBase: 25, dmgPerLevel: 6,  cooldown: 2 },  // 第1-9关
  { hpBase: 7500,  hpPerLevel: 650, dmgBase: 175, dmgPerLevel: 35,  cooldown: 5 }, // 第11-19关
  { hpBase: 13500, hpPerLevel: 700, dmgBase: 225, dmgPerLevel: 40,  cooldown: 5 }, // 第21-29关
  { hpBase: 14500, hpPerLevel: 750, dmgBase: 275, dmgPerLevel: 45,  cooldown: 5 }, // 第31-39关
  { hpBase: 15500, hpPerLevel: 800, dmgBase: 325, dmgPerLevel: 50,  cooldown: 5 }, // 第41-49关
  { hpBase: 16500, hpPerLevel: 850, dmgBase: 375, dmgPerLevel: 55,  cooldown: 5 }, // 第51-59关
  { hpBase: 27500, hpPerLevel: 900, dmgBase: 425, dmgPerLevel: 60,  cooldown: 5 }  // 第61-69关
];

// ★ Boss 定义（10、20 … 70）★
export const bossDefs = [
  { name: 'Ancient Treant',   baseHp: 12000, hpInc: 200, dmg: 150, cooldown: 3 },
  { name: 'Cavern Hydra',     baseHp: 12200, hpInc: 220, dmg: 165, cooldown: 8 },
  { name: 'Sky Lord',         baseHp: 22400, hpInc: 240, dmg: 180, cooldown: 8 },
  { name: 'Inferno Behemoth', baseHp: 22600, hpInc: 260, dmg: 195, cooldown: 8 },
  { name: 'Abyss Leviathan',  baseHp: 22800, hpInc: 280, dmg: 210, cooldown: 8 },
  { name: 'Titan Colossus',   baseHp: 33000, hpInc: 300, dmg: 225, cooldown: 8 },
  { name: 'Void Dragon',      baseHp: 33200, hpInc: 320, dmg: 240, cooldown: 8 }
];

// ------------------------------------------------------------
// 工厂函数
// ------------------------------------------------------------
function createMonster({
  id,
  level,
  name,
  maxHp,
  sprite,
  damage,
  cooldown,
  isBoss = false,
  gold
}) {
  return {
    id,
    level,
    name,
    maxHp,
    sprite,
    isBoss,
    gold,                        // ★ 掉落金币
    turns: cooldown,             // ✅ 玩家可操作的初始回合数
    skill: {
      name: isBoss ? `${name} Fury` : `${name} Strike`,
      desc: `每${cooldown}回合${isBoss ? '对全体' : ''}造成${damage}点伤害`,
      cooldown,
      damage
    }
  };
}

// ------------------------------------------------------------
// 生成 1-70 级
// ------------------------------------------------------------
for (let lv = 1; lv <= 70; lv++) {
  if (lv % 10 === 0) {
    // ---------- Boss ----------
    const idx = lv / 10 - 1;
    const def = bossDefs[idx];
    monsters.push(
      createMonster({
        id: lv,
        level: lv,
        name: def.name,
        maxHp: def.baseHp + def.hpInc * idx,
        sprite: `boss_${idx + 1}.png`,
        damage: def.dmg + 15 * idx,
        cooldown: def.cooldown,
        isBoss: true,
        gold: Math.round(30 + lv * 3)
      })
    );
  } else {
    // ---------- 普通怪 ----------
    const tierIdx = Math.floor((lv - 1) / 10);
    const tier = tierConfigs[tierIdx];
    const levelInSegment = (lv - 1) % 10;
    const nameIdx = (lv - 1) % normalNames.length;
    const zhNames = ['哥布林', '野狼', '骷髅兵', '盗贼', '史莱姆', '兽人', '蜥蜴人', '鹰身女妖', '暗影魔'];
    const enNames = ['goblin', 'wolf', 'skeleton', 'bandit', 'slime', 'orc', 'lizardman', 'harpy', 'shade'];
    
    const zhName = zhNames[nameIdx];
    const spriteName = enNames[nameIdx];  // 🔸 英文名用于图片路径
    
    monsters.push(
      createMonster({
        id: lv,
        level: lv,
        name: zhName,

        maxHp: tier.hpBase + tier.hpPerLevel * levelInSegment,
        sprite: `${spriteName}.png`,
        damage: tier.dmgBase + tier.dmgPerLevel * levelInSegment,
        cooldown: tier.cooldown,
        gold: Math.round(5 + lv * 1.5)
      })
    );
  }
}

// ------------------------------------------------------------
// 71-77：Boss Rush（前述 Boss * 1.2）
// ------------------------------------------------------------
for (let i = 0; i < 7; i++) {
  const src = monsters.find(m => m.level === (i + 1) * 10);
  monsters.push(
    createMonster({
      id: 71 + i,
      level: 71 + i,
      name: `${src.name} (再临)`,
      maxHp: Math.floor(src.maxHp * 1.2),
      sprite: src.sprite,
      damage: Math.floor(src.skill.damage * 1.2),
      cooldown: src.skill.cooldown,
      isBoss: true,
      gold: Math.round(src.gold * 1.2)
    })
  );
}
