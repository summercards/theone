// js/utils/battle_log.js

const logs = [];

/**
 * 添加一条战斗日志
 * @param {string} text - 日志内容
 */
export function logBattle(text) {
  const timestamp = new Date().toLocaleTimeString();
  const msg = `[战斗日志 ${timestamp}] ${text}`;
  logs.push(msg);
  console.log(msg); // ✅ 直接打印到 Console 控制台
  if (logs.length > 100) logs.shift(); // 控制日志数量
}

export function getLogs() {
  return [...logs];
}

export function clearLogs() {
  logs.length = 0;
}
