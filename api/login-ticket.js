/**
 * 获取网页扫码登录用的一次性 ticket，用于生成小程序码并轮询。
 * GET /api/login-ticket 或 POST /api/login-ticket
 */
import { invokeCloud } from './_cloud.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, message: '请使用 GET 或 POST' });
  }
  try {
    const result = await invokeCloud('webAuth', { action: 'createTicket' });
    if (!result.ok || !result.ticket) {
      return res.status(500).json({ ok: false, message: result.message || '创建失败' });
    }
    res.status(200).json({ ok: true, ticket: result.ticket });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message || '服务错误' });
  }
}
