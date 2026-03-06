const env = (process.env.WX_CLOUD_ENV || '').trim();
let cached = { token: '', expires: 0 };

/** 使用稳定版接口获取 access_token（推荐，避免 invalid credential） */
export async function getAccessToken(forceRefresh = false) {
  const appid = (process.env.WX_APPID || '').trim();
  const secret = (process.env.WX_SECRET || '').trim();
  if (!appid || !secret) throw new Error('未配置 WX_APPID / WX_SECRET');
  const res = await fetch('https://api.weixin.qq.com/cgi-bin/stable_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credential',
      appid,
      secret,
      force_refresh: !!forceRefresh
    })
  });
  const data = await res.json();
  if (data.access_token) return data.access_token;
  throw new Error(data.errmsg || data.message || '获取 access_token 失败');
}

export function clearAccessTokenCache() {
  cached = { token: '', expires: 0 };
}

export async function getCachedAccessToken(forceRefresh = false) {
  if (!forceRefresh && cached.token && cached.expires > Date.now()) return cached.token;
  const token = await getAccessToken(forceRefresh);
  cached = { token, expires: Date.now() + 6000 * 1000 };
  return token;
}

function isTokenError(errcode, errmsg) {
  const code = Number(errcode);
  const msg = String(errmsg || '').toLowerCase();
  return code === 40001 || code === 42001 || msg.includes('invalid credential') || msg.includes('not latest');
}

export async function invokeCloud(name, event = {}) {
  if (!env) throw new Error('未配置 WX_CLOUD_ENV');
  const callOnce = async (accessToken) => {
    const url = `https://api.weixin.qq.com/tcb/invokecloudfunction?access_token=${encodeURIComponent(accessToken)}&env=${encodeURIComponent(env)}&name=${encodeURIComponent(name)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    });
    const data = await res.json();
    return data || {};
  };

  let accessToken = await getCachedAccessToken(false);
  let data = await callOnce(accessToken);

  // access_token 相关错误：清缓存后重试一次（不 force_refresh，避免让其它实例的 token 立刻变旧）
  if (data.errcode && data.errcode !== 0 && isTokenError(data.errcode, data.errmsg)) {
    clearAccessTokenCache();
    accessToken = await getCachedAccessToken(false);
    data = await callOnce(accessToken);
  }

  if (data.errcode && data.errcode !== 0) throw new Error(data.errmsg || '云函数调用失败');
  try {
    return data.resp_data ? JSON.parse(data.resp_data) : {};
  } catch (e) {
    throw new Error('云函数返回数据解析失败');
  }
}
