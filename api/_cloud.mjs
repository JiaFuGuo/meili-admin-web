const env = (process.env.WX_CLOUD_ENV || '').trim();
let cached = { token: '', expires: 0 };

/** 使用稳定版接口获取 access_token（推荐，避免 invalid credential） */
export async function getAccessToken() {
  const appid = (process.env.WX_APPID || '').trim();
  const secret = (process.env.WX_SECRET || '').trim();
  if (!appid || !secret) throw new Error('未配置 WX_APPID / WX_SECRET');
  const res = await fetch('https://api.weixin.qq.com/cgi-bin/stable_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credential',
      appid,
      secret
    })
  });
  const data = await res.json();
  if (data.access_token) return data.access_token;
  throw new Error(data.errmsg || '获取 access_token 失败');
}

export async function getCachedAccessToken() {
  if (cached.token && cached.expires > Date.now()) return cached.token;
  const token = await getAccessToken();
  cached = { token, expires: Date.now() + 7000 * 1000 };
  return token;
}

export async function invokeCloud(name, event = {}) {
  if (!env) throw new Error('未配置 WX_CLOUD_ENV');
  const accessToken = await getCachedAccessToken();
  const url = `https://api.weixin.qq.com/tcb/invokecloudfunction?access_token=${encodeURIComponent(accessToken)}&env=${encodeURIComponent(env)}&name=${encodeURIComponent(name)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event)
  });
  const data = await res.json();
  if (data.errcode && data.errcode !== 0) throw new Error(data.errmsg || '云函数调用失败');
  return data.resp_data ? JSON.parse(data.resp_data) : {};
}
