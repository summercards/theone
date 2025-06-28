const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()
  const db         = cloud.database()

  return db.collection('UserSave').doc(OPENID).get()
           .catch(() => ({ data: null }))
}
