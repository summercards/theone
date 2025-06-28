exports.main = async (event, context) => {
  return context.OPENID;    // 新运行时可直接拿到
};