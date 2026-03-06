/**
 * 轮询 ticket 状态：管理员扫码确认后返回 JWT。
 * GET /api/login-poll?ticket=xxx
 */
import { invokeCloud } from './_cloud.mjs';
import { encodeJWT } from './_jwt.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, message: '请使用 GET' });
  }
  const ticket = (req.query.ticket || '').trim();
  if (!ticket) {
    return res.status(400).json({ ok: false, message: '缺少 ticket' });
  }
  try {
    const result = await invokeCloud('webAuth', { action: 'getTicketStatus', ticket });
    if (result.status === 'confirmed' && result.openid) {
      const token = encodeJWT(result.openid);
      return res.status(200).json({ ok: true, token });
    }
    if (result.status === 'expired') {
      return res.status(200).json({ ok: true, status: 'expired' });
    }
    res.status(200).json({ ok: true, status: 'pending' });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message || '服务错误' });
  }
}
