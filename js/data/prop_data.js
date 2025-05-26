// js/data/prop_data.js
/**
 * 五大类别 × 普通/高阶 = 10 个道具
 * price：在胜利弹窗里用来显示 / 扣费
 * icon ：请放到 assets/ui/props/ 对应 png 中
 */
const PropData = {
  list: [
    /* === 1. 属性强化类（仅本场） ============================= */
    { id: 'attr_boost',
      name: '属性精炼石',
      icon: 'attr_boost.png',
      desc: '本场战斗内，将目标英雄的某项属性 +5',
      price: 12 },
    { id: 'attr_boost_plus',
      name: '属性精炼石·高阶',
      icon: 'attr_boost_plus.png',
      desc: '本场战斗内，将目标英雄的某项属性 +10',
      price: 24 },

    /* === 2. 等级提升类（永久） =============================== */
    { id: 'level_chip',
      name: '经验芯片',
      icon: 'level_chip.png',
      desc: '永久使目标英雄等级 +1',
      price: 20 },
    { id: 'level_chip_plus',
      name: '经验芯片·高阶',
      icon: 'level_chip_plus.png',
      desc: '永久使目标英雄等级 +2',
      price: 40 },

    /* === 3. 操作次数类（下一场） ============================= */
    { id: 'extra_action',
      name: '行动令牌',
      icon: 'extra_action.png',
      desc: '下一场战斗玩家可操作次数 +1',
      price: 15 },
    { id: 'extra_action_plus',
      name: '行动令牌·高阶',
      icon: 'extra_action_plus.png',
      desc: '下一场战斗玩家可操作次数 +2',
      price: 30 },

    /* === 4. 初始回合类（下一场） ============================= */
    { id: 'extra_turn',
      name: '延时沙漏',
      icon: 'extra_turn.png',
      desc: '下一场战斗初始回合 +1',
      price: 15 },
    { id: 'extra_turn_plus',
      name: '延时沙漏·高阶',
      icon: 'extra_turn_plus.png',
      desc: '下一场战斗初始回合 +2',
      price: 30 },

    /* === 5. 金币收益类（下一场） ============================= */
    { id: 'gold_double',
      name: '贪婪金币符',
      icon: 'gold_double.png',
      desc: '下一场战斗获得金币翻倍',
      price: 18 },
    { id: 'gold_triple',
      name: '狂热金币符',
      icon: 'gold_triple.png',
      desc: '下一场战斗获得金币三倍',
      price: 36 }
  ],

  /** 根据 id 取道具元数据；找不到则返回 undefined */
  getById (id) { return this.list.find(p => p.id === id); },

  /** 返回一份深拷贝，用于 UI 随机池 */
  getAll () { return this.list.slice(); }
};

export default PropData;
