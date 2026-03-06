/**
 * 根据 ticket 生成小程序码图片，用于网页展示「微信扫码登录」。
 * GET /api/login-qrcode?ticket=xxx
 * 注意：WX_APPID / WX_SECRET 必须是「小程序」的，不能是公众号的。
 */
import { getAccessToken, getCachedAccessToken, clearAccessTokenCache } from './_cloud.mjs';

function isTokenError(err) {
  if (!err || typeof err !== 'object') return false;
  const code = err.errcode;
  const msg = (err.errmsg || '').toLowerCase();
  return code === 42001 || code === 40001 || msg.includes('invalid credential') || msg.includes('not latest');
}

async function requestWxacode(accessToken, ticket) {
  const url = `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${encodeURIComponent(accessToken)}`;
  const body = JSON.stringify({
    scene: ticket,
    page: 'pages/web-login/index',
    width: 280,
    check_path: false,
    env_version: 'trial'
  });
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end();
  }
  const ticket = (req.query.ticket || '').trim();
  if (!ticket) {
    res.status(400).json({ ok: false, message: '缺少 ticket' });
    return;
  }
  try {
    // 生成小程序码时每次直接拉取新 token，不用缓存，避免多实例下「不是最新」报错
    let accessToken = await getAccessToken();
    let wxRes = await requestWxacode(accessToken, ticket);
    const contentType = wxRes.headers.get('content-type') || '';

    if (contentType.indexOf('image') >= 0) {
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'no-store');
      const buf = await wxRes.arrayBuffer();
      res.status(200).end(Buffer.from(buf));
      return;
    }

    const err = await wxRes.json().catch(() => ({}));
    if (isTokenError(err)) {
      clearAccessTokenCache();
      accessToken = await getCachedAccessToken(true);
      wxRes = await requestWxacode(accessToken, ticket);
      const ct2 = wxRes.headers.get('content-type') || '';
      if (ct2.indexOf('image') >= 0) {
        res.setHeader('Content-Type', ct2);
        res.setHeader('Cache-Control', 'no-store');
        const buf = await wxRes.arrayBuffer();
        res.status(200).end(Buffer.from(buf));
        return;
      }
      const err2 = await wxRes.json().catch(() => ({}));
      res.status(500).json({ ok: false, message: err2.errmsg || err.errmsg || '生成二维码失败' });
      return;
    }
    res.status(500).json({ ok: false, message: err.errmsg || '生成二维码失败' });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message || '服务错误' });
  }
}
