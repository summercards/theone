// js/data/prop_data.js
/**
 * ─────────────────────────────────────────────────────────
 * 10 个道具 = 5 大类别 × 2 个阶梯
 *   category   : 用来决定底色（见 ui/prop_ui.js / PROP_COLOR_MAP）
 *   iconChar   : Canvas 上中央显示的系统符号 / emoji
 *   price      : 弹窗里扣费 & 显示
 * ───────────────────────────────────────────────────────── */
const PropData = {
  list: [
    /* === 1. 属性强化类（仅本场） ========================= */
    { id: 'attr_boost',
      name: '属性精炼石',            category: 'attribute',
      iconChar: '⚔️',
      desc: '本场战斗内，将目标英雄的某项属性 +5',
      price: 12 },
    { id: 'attr_boost_plus',
      name: '属性精炼石·高阶',        category: 'attribute',
      iconChar: '⚔️',
      desc: '本场战斗内，将目标英雄的某项属性 +10',
      price: 24 },

    /* === 2. 等级提升类（永久） =========================== */
    { id: 'level_chip',
      name: '经验芯片',              category: 'level',
      iconChar: '⭐',
      desc: '永久使目标英雄等级 +1',
      price: 20 },
    { id: 'level_chip_plus',
      name: '经验芯片·高阶',          category: 'level',
      iconChar: '⭐',
      desc: '永久使目标英雄等级 +2',
      price: 40 },

    /* === 3. 操作次数类（下一场） ========================= */
    { id: 'extra_action',
      name: '行动令牌',              category: 'action',
      iconChar: '🎯',
      desc: '下一场战斗玩家可操作次数 +1',
      price: 15 },
    { id: 'extra_action_plus',
      name: '行动令牌·高阶',          category: 'action',
      iconChar: '🎯',
      desc: '下一场战斗玩家可操作次数 +2',
      price: 30 },

    /* === 4. 初始回合类（下一场） ========================= */
    { id: 'extra_turn',
      name: '延时沙漏',              category: 'turn',
      iconChar: '⏳',
      desc: '下一场战斗初始回合 +1',
      price: 15 },
    { id: 'extra_turn_plus',
      name: '延时沙漏·高阶',          category: 'turn',
      iconChar: '⏳',
      desc: '下一场战斗初始回合 +2',
      price: 30 },

    /* === 5. 金币收益类（下一场） ========================= */
    { id: 'gold_double',
      name: '贪婪金币符',            category: 'gold',
      iconChar: '💰',
      desc: '下一场战斗获得金币翻倍',
      price: 18 },
    { id: 'gold_triple',
      name: '狂热金币符',            category: 'gold',
      iconChar: '💰',
      desc: '下一场战斗获得金币三倍',
      price: 36 }
  ],

  /* ———————— API ———————— */
  getById (id) { return this.list.find(p => p.id === id); },
  getAll ()   { return this.list.slice(); }
};

export default PropData;
