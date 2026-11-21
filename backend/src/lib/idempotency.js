import crypto from 'node:crypto';
import { badRequest } from './errors.js';

export function extractIdempotencyKey(req) {
  const key = req.get('Idempotency-Key') || req.body?.idempotencyKey;
  if (!key || typeof key !== 'string' || key.trim().length < 8 || key.trim().length > 128) {
    throw badRequest(
      'Header Idempotency-Key yang valid diperlukan untuk mencegah pengiriman ganda.',
      { idempotencyKey: 'Idempotency-Key tidak valid' },
      'MISSING_IDEMPOTENCY_KEY'
    );
  }
  return key.trim();
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

export function generateOpaqueToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString('base64url');
}
