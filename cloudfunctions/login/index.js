// cloudfunctions/login/index.js
const cloud = require('wx-server-sdk');
cloud.init();                        // 让 SDK 读取到当前 env

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  return OPENID;                     // 仅返回字符串
};
