const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db  = cloud.database()
const col = db.collection('UserSave')

exports.main = async (event) => {
  const { OPENID }         = cloud.getWXContext()
  const { saveStr, version } = event

  return col.doc(OPENID).set({
    data: { version, data: saveStr }
  }).catch(() =>
    col.doc(OPENID).update({ data: { version, data: saveStr } })
  )
}
