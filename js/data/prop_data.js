// js/data/prop_data.js
const PropData = {
  list: [
    /* ---------- 原 5 个 ---------- */
    {
      id:   'attr_boost',
      name: '属性精炼石',
      icon: 'attr_boost.png',
      desc: '本场战斗内，将目标英雄的某个属性 +5',
      price: 20
    },
    {
      id:   'level_chip',
      name: '经验芯片',
      icon: 'level_chip.png',
      desc: '永久使目标英雄等级 +1',
      price: 30
    },
    {
      id:   'extra_action',
      name: '行动令牌',
      icon: 'extra_action.png',
      desc: '下一场战斗玩家可操作次数 +1',
      price: 15
    },
    {
      id:   'extra_turn',
      name: '延时沙漏',
      icon: 'extra_turn.png',
      desc: '下一场战斗初始回合 +1',
      price: 15
    },
    {
      id:   'gold_double',
      name: '贪婪金币符',
      icon: 'gold_double.png',
      desc: '下一场战斗获得金币翻倍',
      price: 20
    },

    /* ---------- 新增 5 个 ---------- */
    {
      id:   'attr_boost_plus',
      name: '属性精炼石·大',
      icon: 'attr_boost_plus.png',
      desc: '本场战斗内，将目标英雄的某个属性 +10',
      price: 22
    },
    {
      id:   'level_chip_plus',
      name: '进阶经验芯片',
      icon: 'level_chip_plus.png',
      desc: '永久使目标英雄等级 +2',
      price: 55
    },
    {
      id:   'revive_token',
      name: '复活徽章',
      icon: 'revive_token.png',
      desc: '下一场战斗若有英雄阵亡，自动复活一次',
      price: 40
    },
    {
      id:   'cleanse_scroll',
      name: '驱散卷轴',
      icon: 'cleanse_scroll.png',
      desc: '立即移除所有英雄的负面效果',
      price: 18
    },
    {
      id:   'reroll_ticket',
      name: '重铸券',
      icon: 'reroll_ticket.png',
      desc: '过关弹窗中的随机选项重新抽取一次',
      price: 13
    }
  ],

  /** 返回道具元数据（找不到则 undefined） */
  getById (id) { return this.list.find(p => p.id === id); },

  /** 深拷贝一份全部道具，用于 UI 遍历 */
  getAll () { return this.list.slice(); }
};

export default PropData;
