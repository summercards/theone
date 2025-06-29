/* =============================================================
   js/utils/cloud_save.js    —  完整覆盖版
   ============================================================= */

   const ENV_ID = 'cloud1-2g34dr2u6cf677ca';     // <<< 改成你的 envId
   const LOCAL_SET = wx.setStorageSync;
   const LOCAL_GET = wx.getStorageSync;
   
   let inited = false;
   let pending = {};
   let timer   = null;
   let OPENID  = null;
   
   /* ---------- 初始化 ---------- */
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
   
   /* ---------- 拿 openid（缓存） ---------- */
   async function ensureOpenId () {
     if (OPENID) return OPENID;
     const res = await wx.cloud.callFunction({ name: 'login' });
     OPENID    = res.result;        // login 只返回字符串
     return OPENID;
   }
   
   /* ---------- 云 → 本地（启动灌入） ---------- */
/* ---------- 云 → 本地（启动灌入） ---------- */
export async function loadAll () {
  if (!inited) return {};

  const db     = wx.cloud.database();
  const openid = await ensureOpenId();
  if (!openid) return {};

  // 查询当前用户唯一一条存档
  const res = await db.collection('player_saves')
                      .where({ _openid: openid })
                      .limit(1)
                      .get()
                      .catch(err => {
                        console.error('[cloud_save] 查询失败', err);
                        return { data: [] };
                      });

  // ====== 调试输出 ======
  console.log('[debug] 当前 openid =', openid);
  console.log('[debug] 查询结果 =', res.data);
  // =====================

  if (!res.data.length) return {};     // 云端无存档

  const doc  = res.data[0];            // 直接拿整条文档
  const save = {};

  // 把除系统字段外的键全部写进本地
  Object.keys(doc).forEach(key => {
    if (key.startsWith('_')) return;   // _id, _openid 等忽略
    LOCAL_SET(key, doc[key]);
    save[key] = doc[key];
  });

  console.log('[cloud_save] 云端数据已回灌到本地');
  return save;                         // 供游戏逻辑使用
}

   
   /* ---------- 本地 → 云端（防抖 3 s） ---------- */
   export function queueSave (key, val) {
     if (!inited) return;
     pending[key] = val;
     if (!timer) timer = setTimeout(flush, 3000);
   }
   
   async function flush () {
     timer = null;
     if (!Object.keys(pending).length) return;
   
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
     console.log('[cloud_save] → 云端 OK', Object.keys(pending));
     pending = {};
   }
   
   /* ---------- 首次整包迁移 ---------- */
   export async function migrateLocalToCloudOnce () {
     if (!inited) return;
     const db     = wx.cloud.database();
     const openid = await ensureOpenId();
     if (!openid) return;
   
     const exist = await db.collection('player_saves')
                           .where({ _openid: openid }).count();
     if (exist.total) return;                        // 已迁移
   
     const info = wx.getStorageInfoSync();
     const dump = {};
     info.keys.forEach(k => (dump[k] = LOCAL_GET(k)));
   
     await db.collection('player_saves').add({ data: dump });
     console.log('[cloud_save] 首次迁移完成，本地 → 云端');
   }
   