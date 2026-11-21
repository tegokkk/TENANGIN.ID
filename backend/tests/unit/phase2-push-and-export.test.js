import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  buildVapidAuthHeader,
  encryptWebPushPayload,
  generateVapidKeyPair,
} from '../../src/lib/web-push.js';
import { buildCsvDocument, escapeCsvCell } from '../../src/modules/exports/exports.routes.js';

function decryptWebPushForTest(encryptedBody, clientEcdh, authSecret) {
  const salt = encryptedBody.subarray(0, 16);
  const idlen = encryptedBody.readUInt8(20);
  const asPublic = encryptedBody.subarray(21, 21 + idlen);
  const ciphertextWithTag = encryptedBody.subarray(21 + idlen);
  const ciphertext = ciphertextWithTag.subarray(0, ciphertextWithTag.length - 16);
  const authTag = ciphertextWithTag.subarray(ciphertextWithTag.length - 16);

  const sharedSecret = clientEcdh.computeSecret(asPublic);
  const keyInfo = Buffer.concat([
    Buffer.from('WebPush: info\x00', 'utf8'),
    clientEcdh.getPublicKey(),
    asPublic,
  ]);
  const ikm = Buffer.from(crypto.hkdfSync('sha256', sharedSecret, authSecret, keyInfo, 32));
  const cek = Buffer.from(
    crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\x00', 'utf8'), 16)
  );
  const nonce = Buffer.from(
    crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\x00', 'utf8'), 12)
  );

  const decipher = crypto.createDecipheriv('aes-128-gcm', cek, nonce);
  decipher.setAuthTag(authTag);
  const padded = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  // Hapus padding delimiter 0x02 dan nol di belakang
  let end = padded.length - 1;
  while (end >= 0 && padded[end] === 0) end--;
  if (padded[end] !== 0x02) throw new Error('Delimiter padding RFC 8188 tidak valid');
  return padded.subarray(0, end).toString('utf8');
}

describe('Unit L01 & L04: Web Push RFC 8291/8292 & Sanitasi Ekspor CSV', () => {
  it('menghasilkan kunci VAPID P-256, header JWT ES256 yang sah, dan mengenkripsi payload aes128gcm hingga dapat didekripsi klien', () => {
    const vapidKeys = generateVapidKeyPair();
    const header = buildVapidAuthHeader({
      endpoint: 'https://push.example.invalid/send/abc123',
      vapidKeys: { ...vapidKeys, subject: 'mailto:pengelola@tenangin.id' },
      ttlSeconds: 600,
    });
    expect(header).toMatch(/^vapid t=[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+, k=/);

    const jwtPart = header.split('t=')[1].split(',')[0];
    const [hB64, pB64, sigB64] = jwtPart.split('.');
    const pubBuf = Buffer.from(vapidKeys.publicKey, 'base64url');
    const pubKeyObj = crypto.createPublicKey({
      key: {
        kty: 'EC',
        crv: 'P-256',
        x: pubBuf.subarray(1, 33).toString('base64url'),
        y: pubBuf.subarray(33, 65).toString('base64url'),
      },
      format: 'jwk',
    });
    const verified = crypto.verify(
      'sha256',
      Buffer.from(`${hB64}.${pB64}`, 'utf8'),
      { key: pubKeyObj, dsaEncoding: 'ieee-p1363' },
      Buffer.from(sigB64, 'base64url')
    );
    expect(verified).toBe(true);

    const clientEcdh = crypto.createECDH('prime256v1');
    clientEcdh.generateKeys();
    const authSecret = crypto.randomBytes(16);

    const original = JSON.stringify({
      title: 'TENANGIN.ID',
      body: 'Ada jeda singkat 3 menit untukmu?',
      url: '/app',
    });
    const { body } = encryptWebPushPayload({
      payloadJson: original,
      p256dhBase64Url: clientEcdh.getPublicKey().toString('base64url'),
      authBase64Url: authSecret.toString('base64url'),
    });

    const decrypted = decryptWebPushForTest(body, clientEcdh, authSecret);
    expect(decrypted).toBe(original);
  });

  it('mencegah formula injection dan menyusun CSV RFC 4180 dengan benar', () => {
    expect(escapeCsvCell('=CMD("calc")')).toBe("'=CMD(\"\"calc\"\")"
      .replace("'=CMD(\"\"calc\"\")", `"'=CMD(""calc"")"`));
    const csv = buildCsvDocument(
      ['kategori', 'catatan'],
      [
        ['journal', '=HYPERLINK("https://evil.invalid")'],
        ['mood', 'Tenang, lega\nlanjut'],
      ]
    );
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain('"Tenang, lega\nlanjut"');
  });
});
