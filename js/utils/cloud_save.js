const ENV_ID     = 'cloud1-2g34dr2u6cf677ca';  // <<< 改成你的 envId
const LOCAL_SET  = wx.setStorageSync;
const LOCAL_GET  = wx.getStorageSync;

let inited   = false;
let pending  = {};
let timer    = null;
let OPENID   = null;
let lastSaved = {};
let lastFlushTime = 0;
let isMarkedDeleted = false; // ✅ 云端标记为已删除
const MIN_FLUSH_INTERVAL = 10000;

export function initCloud () {
  if (!wx.cloud) {
    console.warn('[cloud_save] 未启用云开发，降级本地存档');
    return false;
  }
  if (inited) return true;
  wx.cloud.init({ env: ENV_ID, traceUser: true });
  inited = true;
  return true;
}

async function ensureOpenId () {
  if (OPENID) return OPENID;
  const res = await wx.cloud.callFunction({ name: 'login' });
  OPENID = res.result;
  return OPENID;
}

export async function loadAll () {
  if (!inited) return {};
  const db     = wx.cloud.database();
  const openid = await ensureOpenId();
  if (!openid) return {};

  const res = await db.collection('player_saves')
                      .where({ _openid: openid })
                      .limit(1)
                      .get()
                      .catch(err => {
                        console.error('[cloud_save] 查询失败', err);
                        return { data: [] };
                      });

                      if (!res.data.length) {
                        console.warn('[cloud_save] 云端无存档，清空本地数据');
                        wx.clearStorageSync();              // ✅ 清空本地
                        isMarkedDeleted = true;            // ✅ 防止本地存档再次上传
                        return {};
                      }

  const doc = res.data[0];

  if (doc.isDeleted) {
    isMarkedDeleted = true;
    console.warn('[cloud_save] 云端存档标记为已删除，清空本地数据');
    wx.clearStorageSync();
    return {};
  }

  const save = {};
  Object.keys(doc).forEach(key => {
    if (key.startsWith('_')) return;
    LOCAL_SET(key, doc[key]);
    save[key] = doc[key];
    lastSaved[key] = doc[key];
  });

  console.log('[cloud_save] 云端数据已回灌到本地');
  return save;
}

export function queueSave (key, val) {
  if (!inited || isMarkedDeleted) return;

  const prev = lastSaved[key];
  const isSame = JSON.stringify(prev) === JSON.stringify(val);
  if (isSame) {
    console.log(`[cloud_save] 跳过未变化字段：${key}`);
    return;
  }

  lastSaved[key] = val;
  LOCAL_SET(key, val);
  pending[key] = val;

  if (!timer) timer = setTimeout(flush, 3000);
}

export function setProfile (profile) {
  if (!inited || isMarkedDeleted) return;

  const nickChanged   = JSON.stringify(lastSaved['nick'])   !== JSON.stringify(profile.nick);
  const avatarChanged = JSON.stringify(lastSaved['avatar']) !== JSON.stringify(profile.avatar);

  if (nickChanged) {
    LOCAL_SET('nick', profile.nick);
    pending.nick = profile.nick;
    lastSaved['nick'] = profile.nick;
  }

  if (avatarChanged) {
    LOCAL_SET('avatar', profile.avatar);
    pending.avatar = profile.avatar;
    lastSaved['avatar'] = profile.avatar;
  }

  if ((nickChanged || avatarChanged) && !timer) {
    timer = setTimeout(flush, 3000);
  }
}

async function flush () {
  timer = null;
  if (isMarkedDeleted) {
    console.warn('[cloud_save] 存档已标记删除，禁止上传');
    return;
  }

  const now = Date.now();
  if (now - lastFlushTime < MIN_FLUSH_INTERVAL) {
    console.log(`[cloud_save] ⚠️ 距上次上传不足 ${MIN_FLUSH_INTERVAL / 1000}s，延后上传`);
    if (!timer) timer = setTimeout(flush, MIN_FLUSH_INTERVAL);
    return;
  }

  lastFlushTime = now;

  const keys = Object.keys(pending);
  if (!keys.length) return;

  const db     = wx.cloud.database();
  const openid = await ensureOpenId();
  if (!openid) return;

  const col   = db.collection('player_saves');
  const match = await col.where({ _openid: openid }).limit(1).get();

  if (!match.data.length) {
    await col.add({ data: pending });
  } else {
    await col.doc(match.data[0]._id).update({ data: pending });
  }

  console.log('[cloud_save] ✅ 云端同步成功字段：', keys);
  pending = {};
}

export async function migrateLocalToCloudOnce () {
  if (!inited) return;
  const db     = wx.cloud.database();
  const openid = await ensureOpenId();
  if (!openid) return;

  const exist = await db.collection('player_saves')
                        .where({ _openid: openid }).count();
  if (exist.total) return;

  const info = wx.getStorageInfoSync();
  const dump = {};
  info.keys.forEach(k => {
    const val = LOCAL_GET(k);
    dump[k] = val;
    lastSaved[k] = val;
  });

  await db.collection('player_saves').add({ data: dump });
  console.log('[cloud_save] 首次整包迁移成功');
}

export async function deleteCloudSave () {
  await wx.cloud.callFunction({
    name: 'saveGame',
    data: { markDeleted: true }
  });
  wx.clearStorageSync();
  console.log('[cloud_save] 存档已被删除（本地+云端）');
}
