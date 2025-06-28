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
  if (!inited) return {};                   // 1. 未初始化直接退出
  const db     = wx.cloud.database();
  const openid = await ensureOpenId();
  if (!openid) return {};                   // 2. 取不到 openid 也退出

  // 3. 查询当前用户唯一一条存档
  const res = await db.collection('player_saves')
                      .where({ _openid: openid })
                      .limit(1)
                      .get()
                      .catch(() => ({ data: [] }));

  if (!res.data.length) return {};          // 4. 第一次登录：云端无数据

  const doc  = res.data[0];                 // 5. 直接拿整条文档
  const save = {};                          //    用来回传给调用方

  // 6. 把除系统字段外的键全部写回本地
  Object.keys(doc).forEach(key => {
    if (key.startsWith('_')) return;        //    忽略 _id / _openid / _createTime ...
    LOCAL_SET(key, doc[key]);               //    写入本地缓存
    save[key] = doc[key];                   //    累积到返回对象
  });

  console.log('[cloud_save] 云端数据已回灌到本地');
  return save;                              // 7. 供游戏逻辑读取
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
   