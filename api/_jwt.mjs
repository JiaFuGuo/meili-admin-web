import crypto from 'crypto';

const JWT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function getSecret() {
  return process.env.JWT_SECRET || process.env.WX_SECRET || '';
}

export function encodeJWT(openid) {
  const secret = getSecret();
  if (!secret) throw new Error('未配置 JWT_SECRET 或 WX_SECRET');
  const payload = JSON.stringify({ openid, t: Date.now() });
  const payloadB64 = Buffer.from(payload, 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  return payloadB64 + '.' + sig;
}

export function decodeJWT(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  const secret = getSecret();
  if (!secret) return null;
  const expectedSig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!payload.openid || (Date.now() - (payload.t || 0) > JWT_MAX_AGE_MS)) return null;
    return payload;
  } catch (e) {
    return null;
  }
}
