const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { saveData, markDeleted = false } = event;
  const { OPENID } = cloud.getWXContext();

  const col = db.collection('player_saves');
  const record = await col.where({ _openid: OPENID }).limit(1).get();

  if (markDeleted) {
    if (record.data.length) {
      await col.doc(record.data[0]._id).update({
        data: {
          isDeleted: true,
          deletedAt: Date.now()
        }
      });
    } else {
      await col.add({
        data: {
          _openid: OPENID,
          isDeleted: true,
          deletedAt: Date.now()
        }
      });
    }
    return { status: 'marked_deleted' };
  }

  if (record.data.length && record.data[0].isDeleted) {
    return { error: 'cloud_save_deleted', message: '云端存档已删除，禁止上传' };
  }

  if (record.data.length) {
    await col.doc(record.data[0]._id).update({ data: saveData });
  } else {
    await col.add({ data: saveData });
  }

  return { status: 'ok' };
};
