// js/data/prop_data.js
/**
 * ─────────────────────────────────────────────────────────
 * 物品统一字典：
 *   id        : 全局唯一键（掉落表 / 商店 / 背包都用它）
 *   category  : UI 上决定底色、分组
 *   iconChar  : Canvas 上显示的 emoji / 单字符（也可用贴图名）
 *   desc      : 说明文本（背包 / 弹窗用）
 *   onUse()   : 可选，背包点击“使用”时执行
 * ───────────────────────────────────────────────────────── */
const PropData = {
    list: [
      /* === Currency ====================================================== */
      { id: 'coin',
        name: '金币',                 category: 'currency',
        iconChar: '💰',               // ← 改这里
        desc: '通用货币，用于升级与购买' },
  
      /* === Consumables (掉落药水) ======================================= */
      { id: 'potion_small',
        name: '小型生命药剂',         category: 'potion',
        iconChar: '🧪',
        desc: '立即回复 10 点生命' },
      { id: 'potion_mid',
        name: '中型生命药剂',         category: 'potion',
        iconChar: '🧪',
        desc: '立即回复 25 点生命' },
      { id: 'potion_big',
        name: '大型生命药剂',         category: 'potion',
        iconChar: '🧪',
        desc: '立即回复 50 点生命' },
  
      /* === Scrolls (卷轴) =============================================== */
      { id: 'scroll_fire',
        name: '火球卷轴',             category: 'scroll',
        iconChar: '📜',
        desc: '战斗中施放 120 火焰伤害' },
      { id: 'scroll_meteor',
        name: '陨石卷轴',             category: 'scroll',
        iconChar: '📜',
        desc: '战斗中群体陨石伤害' },
  
      /* === Materials / Buffs ============================================ */
      { id: 'hero_shard',
        name: '英雄碎片',             category: 'material',
        iconChar: '🧩',
        desc: '集齐可升星英雄' },
      { id: 'elixir_attack',
        name: '攻击精华',             category: 'elixir',
        iconChar: '💥',
        desc: '永久提升英雄攻击力' },
  
      /* === 原有 10 个商城道具（保留原写法） ============================= */
      { id: 'attr_boost',
        name: '属性精炼石',           category: 'attribute',
        iconChar: '⚔️',
        desc: '本场战斗内，将目标英雄的某项属性 +5',
        price: 12 },
      { id: 'attr_boost_plus',
        name: '属性精炼石·高阶',       category: 'attribute',
        iconChar: '⚔️',
        desc: '本场战斗内，将目标英雄的某项属性 +10',
        price: 24 },
      { id: 'level_chip',
        name: '经验芯片',             category: 'level',
        iconChar: '⭐',
        desc: '永久使目标英雄等级 +1',
        price: 20 },
      { id: 'level_chip_plus',
        name: '经验芯片·高阶',         category: 'level',
        iconChar: '⭐',
        desc: '永久使目标英雄等级 +2',
        price: 40 },
      { id: 'extra_action',
        name: '行动令牌',             category: 'action',
        iconChar: '🎯',
        desc: '下一场战斗玩家可操作次数 +1',
        price: 15 },
      { id: 'extra_action_plus',
        name: '行动令牌·高阶',         category: 'action',
        iconChar: '🎯',
        desc: '下一场战斗玩家可操作次数 +2',
        price: 30 },
      { id: 'extra_turn',
        name: '延时沙漏',             category: 'turn',
        iconChar: '⏳',
        desc: '下一场战斗初始回合 +1',
        price: 15 },
      { id: 'extra_turn_plus',
        name: '延时沙漏·高阶',         category: 'turn',
        iconChar: '⏳',
        desc: '下一场战斗初始回合 +2',
        price: 30 },
      { id: 'gold_double',
        name: '贪婪金币符',           category: 'gold',
        iconChar: '💰',
        desc: '下一场战斗获得金币翻倍',
        price: 18 },
      { id: 'gold_triple',
        name: '狂热金币符',           category: 'gold',
        iconChar: '💰',
        desc: '下一场战斗获得金币三倍',
        price: 36 }
    ],
  
    /* ———————— API ———————— */
    getById (id)  { return this.list.find(p => p.id === id); },
    getAll ()     { return this.list.slice(); }
  };
  
  /* 方便直接通过 PropData[id] 取到对象 */
  PropData.list.forEach(p => { PropData[p.id] = p; });
  
  export default PropData;
  