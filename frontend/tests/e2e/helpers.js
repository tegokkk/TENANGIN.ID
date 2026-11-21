import crypto from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateTotpCode(base32Secret, timestampMs = Date.now()) {
  const clean = base32Secret.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = '';
  for (const char of clean) {
    const val = BASE32_ALPHABET.indexOf(char);
    if (val === -1) throw new Error(`Invalid base32 char: ${char}`);
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  const key = Buffer.from(bytes);

  const counter = Math.floor(timestampMs / 1000 / 30);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const codeInt =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(codeInt % 1_000_000).padStart(6, '0');
}
