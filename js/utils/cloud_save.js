/* =============================================================
   通用云存档工具 —— 只维护这一份
   ============================================================= */

   const ENV_ID = 'cloud1-2g34dr2u6cf677ca';          // <<< 换成你的 envId
   const LOCAL_SET = wx.setStorageSync;
   const LOCAL_GET = wx.getStorageSync;
   
   let inited  = false;                   // 是否已 initCloud
   let pending = {};                      // 待写入键值对
   let timer   = null;                    // 防抖句柄
   let OPENID  = null;                    // 缓存 openid
   
   /* ---------- 初始化云 SDK ---------- */
   export function initCloud () {
     if (!wx.cloud) {
       console.warn('[cloud_save] 基础库过旧或未开启云开发，降级为纯本地存档');
       return false;
     }
     if (inited) return true;
     wx.cloud.init({ env: ENV_ID, traceUser: true });
     inited = true;
     return true;
   }
   
   /* ---------- 获取并缓存 openid ---------- */
   async function ensureOpenId () {
     if (OPENID) return OPENID;
     try {
       const res = await wx.cloud.callFunction({ name: 'login' });
       OPENID = res.result;                 // login 只返回字符串
       return OPENID;
     } catch (e) {
       console.warn('[cloud_save] 获取 openid 失败，离线降级', e);
       return null;
     }
   }
   
   /* ---------- 云 → 本地（游戏启动用） ---------- */
   export async function loadAll () {
     if (!inited) return {};
     try {
       const db     = wx.cloud.database();
       const openid = await ensureOpenId();
       if (!openid) return {};
   
       const res = await db.collection('player_saves')
                           .where({ _openid: openid })
                           .limit(1).get();
       if (!res.data.length) return {};
   
       const cloudData = res.data[0].data;
       Object.keys(cloudData).forEach(k => LOCAL_SET(k, cloudData[k]));
       console.log('[cloud_save] 云端数据已回灌到本地');
       return cloudData;
     } catch (e) {
       console.warn('[cloud_save] 读取云端失败，离线模式继续', e);
       return {};
     }
   }
   
   /* ---------- 本地 → 云端：排队 + 防抖写 ---------- */
   export function queueSave (key, value) {
     if (!inited) return;                 // 离线时直接返回
     pending[key] = value;
     if (!timer) timer = setTimeout(flush, 3000);   // 3 秒合并一次
   }
   
   async function flush () {
     timer = null;
     if (!Object.keys(pending).length) return;
   
     try {
       const db     = wx.cloud.database();
       const openid = await ensureOpenId();
       if (!openid) return;
   
       const col   = db.collection('player_saves');
       const exist = await col.where({ _openid: openid }).limit(1).get();
   
       if (!exist.data.length) {
         await col.add({ data: pending });                      // 首次写
       } else {
         const id = exist.data[0]._id;
         await col.doc(id).update({ data: pending });           // 合并更新
       }
       console.log('[cloud_save] → 云端 OK', Object.keys(pending));
     } catch (e) {
       console.warn('[cloud_save] 写入云端失败，将在下次触发时重试', e);
     } finally {
       pending = {};
     }
   }
   
   /* ---------- 一次性：旧本地整包上传 ---------- */
   export async function migrateLocalToCloudOnce () {
     if (!inited) return;
     try {
       const db     = wx.cloud.database();
       const openid = await ensureOpenId();
       if (!openid) return;
   
       const exist = await db.collection('player_saves')
                             .where({ _openid: openid }).limit(1).get();
       if (exist.data.length) return;                         // 已迁移过
   
       const info = wx.getStorageInfoSync();
       const dump = {};
       info.keys.forEach(k => (dump[k] = LOCAL_GET(k)));
   
       await db.collection('player_saves').add({ data: dump });
       console.log('[cloud_save] 首次迁移完成，本地 → 云端');
     } catch (e) {
       console.warn('[cloud_save] 首次迁移失败', e);
     }
   }
   