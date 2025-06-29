/* =============================================================
   js/utils/cloud_save.js — 完整覆盖版（支持昵称 & 头像同步）
   ============================================================= */

   const ENV_ID     = 'cloud1-2g34dr2u6cf677ca';  // <<< 改成你的 envId
   const LOCAL_SET  = wx.setStorageSync;
   const LOCAL_GET  = wx.getStorageSync;
   
   let inited   = false;
   let pending  = {};
   let timer    = null;
   let OPENID   = null;
   
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
     OPENID = res.result;  // login 云函数需只返回 openid 字符串
     return OPENID;
   }
   
   /* =============================================================
      云 → 本地（启动时拉取并写入 localStorage）
      ============================================================= */
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
   
     console.log('[cloud_save] 当前 openid =', openid);
     console.log('[cloud_save] 查询结果 =', res.data);
   
     if (!res.data.length) return {};  // 云端无存档
   
     const doc = res.data[0];
     const save = {};
   
     // 把除系统字段外的键全部写进本地
     Object.keys(doc).forEach(key => {
       if (key.startsWith('_')) return;  // 忽略 _id, _openid, etc.
       LOCAL_SET(key, doc[key]);
       save[key] = doc[key];
     });
   
     console.log('[cloud_save] 云端数据已回灌到本地');
     return save;
   }
   
   /* =============================================================
      本地 → 云端（防抖 3s）：主力函数
      ============================================================= */
   export function queueSave (key, val) {
     if (!inited) return;
     // 保存到 localStorage
     LOCAL_SET(key, val);
     // 标记待同步
     pending[key] = val;
     if (!timer) timer = setTimeout(flush, 3000);
   }
   
   /* ---------- 专门写入 profile 的辅助函数 ---------- */
   export function setProfile (profile) {
     if (!inited) return;
     // profile = { nick: '昵称', avatar: '头像URL' }
     LOCAL_SET('nick', profile.nick);
     LOCAL_SET('avatar', profile.avatar);
     pending.nick   = profile.nick;
     pending.avatar = profile.avatar;
     if (!timer) timer = setTimeout(flush, 3000);
   }
   
   async function flush () {
     timer = null;
     const keys = Object.keys(pending);
     if (!keys.length) return;
   
     const db     = wx.cloud.database();
     const openid = await ensureOpenId();
     if (!openid) return;
   
     const col   = db.collection('player_saves');
     const match = await col.where({ _openid: openid }).limit(1).get();
   
     if (!match.data.length) {
       // 如果无记录，add 一条
       await col.add({ data: pending });
     } else {
       // 已有记录，update
       await col.doc(match.data[0]._id).update({ data: pending });
     }
     console.log('[cloud_save] → 云端 OK 同步字段：', keys);
     pending = {};
   }
   
   /* =============================================================
      首次整包迁移（localStorage → 云端，仅执行一次）
      ============================================================= */
   export async function migrateLocalToCloudOnce () {
     if (!inited) return;
     const db     = wx.cloud.database();
     const openid = await ensureOpenId();
     if (!openid) return;
   
     const exist = await db.collection('player_saves')
                           .where({ _openid: openid }).count();
     if (exist.total) return;  // 已迁移过
   
     const info = wx.getStorageInfoSync();
     const dump = {};
     info.keys.forEach(k => { dump[k] = LOCAL_GET(k); });
   
     await db.collection('player_saves').add({ data: dump });
     console.log('[cloud_save] 本地数据首次迁移完成');
   }
   