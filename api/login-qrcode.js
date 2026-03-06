/**
 * 根据 ticket 生成小程序码图片，用于网页展示「微信扫码登录」。
 * GET /api/login-qrcode?ticket=xxx
 */
import { getCachedAccessToken } from './_cloud.mjs';

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
    const accessToken = await getCachedAccessToken();
    const url = `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${encodeURIComponent(accessToken)}`;
    const body = JSON.stringify({
      scene: ticket,
      page: 'pages/web-login/index',
      width: 280,
      check_path: false,
      env_version: 'trial'
    });
    const wxRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });
    const contentType = wxRes.headers.get('content-type') || '';
    if (contentType.indexOf('image') >= 0) {
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'no-store');
      const buf = await wxRes.arrayBuffer();
      res.status(200).end(Buffer.from(buf));
      return;
    }
    const err = await wxRes.json().catch(() => ({}));
    res.status(500).json({ ok: false, message: err.errmsg || '生成二维码失败' });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message || '服务错误' });
  }
}
