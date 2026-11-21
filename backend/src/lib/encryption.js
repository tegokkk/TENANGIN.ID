import crypto from 'node:crypto';

/**
 * Enkripsi terautentikasi AES-256-GCM dengan dukungan versi kunci dan rotasi key ring.
 * Format tersimpan: JSON string atau object { key_id, iv, tag, ct } atau string `v1:<keyId>:<iv>:<tag>:<ct>`.
 */
export function buildKeyRing(activeKeyId, activeKeyHex, extraKeyRingStr = '') {
  const keys = new Map();
  const parseHex = (hex) => {
    const buf = Buffer.from(hex.trim(), 'hex');
    if (buf.length !== 32) {
      throw new Error('ENCRYPTION_KEY harus berupa 64 karakter hex (32 byte).');
    }
    return buf;
  };

  keys.set(activeKeyId, parseHex(activeKeyHex));

  if (extraKeyRingStr) {
    for (const entry of extraKeyRingStr.split(',')) {
      const trimmed = entry.trim();
      if (!trimmed) continue;
      const [id, hex] = trimmed.split(':');
      if (id && hex) {
        keys.set(id.trim(), parseHex(hex));
      }
    }
  }

  return {
    activeKeyId,
    keys,
  };
}

export function encryptSensitiveText(plaintext, keyRing) {
  if (plaintext === null || plaintext === undefined) return null;
  const text = String(plaintext);
  const key = keyRing.keys.get(keyRing.activeKeyId);
  if (!key) {
    throw new Error(`Kunci enkripsi aktif "${keyRing.activeKeyId}" tidak ditemukan.`);
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `v1:${keyRing.activeKeyId}:${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`;
}

export function decryptSensitiveText(payload, keyRing) {
  if (payload === null || payload === undefined || payload === '') return payload;
  const str = String(payload);
  if (!str.startsWith('v1:')) {
    throw new Error('Format ciphertext tidak dikenal.');
  }
  const parts = str.split(':');
  if (parts.length !== 5) {
    throw new Error('Struktur ciphertext terenkripsi tidak valid.');
  }
  const [, keyId, ivB64, tagB64, ctB64] = parts;
  const key = keyRing.keys.get(keyId);
  if (!key) {
    throw new Error(`Kunci dekripsi untuk versi "${keyId}" tidak tersedia.`);
  }

  const iv = Buffer.from(ivB64, 'base64url');
  const tag = Buffer.from(tagB64, 'base64url');
  const ct = Buffer.from(ctB64, 'base64url');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ct), decipher.final()]);
  return decrypted.toString('utf8');
}

export function encryptSensitiveJson(obj, keyRing) {
  return encryptSensitiveText(JSON.stringify(obj), keyRing);
}

export function decryptSensitiveJson(payload, keyRing) {
  const raw = decryptSensitiveText(payload, keyRing);
  return raw ? JSON.parse(raw) : null;
}
