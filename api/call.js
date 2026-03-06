/**
 * 代理调用微信云函数。需先通过「微信扫码登录」获取 token，请求头带 Authorization: Bearer <token>。
 * POST body: { fn: "admin"|"blacklist", data: { action, ... } }
 */
import { invokeCloud } from './_cloud.mjs';
import { decodeJWT } from './_jwt.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: '请使用 POST' });
  }
  const auth = (req.headers.authorization || '').trim();
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const payload = decodeJWT(token);
  if (!payload || !payload.openid) {
    return res.status(401).json({ ok: false, code: 'NOT_LOGIN', message: '请先登录' });
  }
  const openid = payload.openid;

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch (e) {
    return res.status(400).json({ ok: false, message: '请求体格式错误' });
  }
  const fn = (body.fn || 'admin').trim();
  const data = body.data && typeof body.data === 'object' ? body.data : {};
  if (!['admin', 'blacklist'].includes(fn)) {
    return res.status(400).json({ ok: false, message: 'fn 只能为 admin 或 blacklist' });
  }

  try {
    const event = { ...data, _openid: openid };
    const result = await invokeCloud(fn, event);
    res.status(200).json(result);
  } catch (e) {
    res.status(200).json({ ok: false, message: e.message || '云函数调用失败' });
  }
}
