import crypto from 'node:crypto';

let cachedEphemeralKeys = null;

function padBytes(buf, targetLength) {
  if (buf.length === targetLength) return buf;
  if (buf.length > targetLength) return buf.subarray(buf.length - targetLength);
  return Buffer.concat([Buffer.alloc(targetLength - buf.length), buf]);
}

export function generateVapidKeyPair() {
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  return {
    publicKey: ecdh.getPublicKey().toString('base64url'),
    privateKey: padBytes(ecdh.getPrivateKey(), 32).toString('base64url'),
  };
}

export function resolveVapidKeys(env = {}) {
  if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
    return {
      publicKey: env.VAPID_PUBLIC_KEY.trim(),
      privateKey: env.VAPID_PRIVATE_KEY.trim(),
      subject: (env.VAPID_SUBJECT || 'mailto:pengelola@tenangin.id').trim(),
      isEphemeral: false,
    };
  }
  if (!cachedEphemeralKeys) {
    cachedEphemeralKeys = generateVapidKeyPair();
  }
  return {
    publicKey: cachedEphemeralKeys.publicKey,
    privateKey: cachedEphemeralKeys.privateKey,
    subject: (env.VAPID_SUBJECT || 'mailto:pengelola@tenangin.id').trim(),
    isEphemeral: true,
  };
}

export function buildVapidAuthHeader({ endpoint, vapidKeys, ttlSeconds = 43200, nowSec = Math.floor(Date.now() / 1000) }) {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const headerB64 = Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).toString('base64url');
  const payloadB64 = Buffer.from(
    JSON.stringify({
      aud: audience,
      exp: nowSec + Math.min(Math.max(ttlSeconds, 60), 86400),
      sub: vapidKeys.subject || 'mailto:pengelola@tenangin.id',
    })
  ).toString('base64url');

  const signingInput = `${headerB64}.${payloadB64}`;
  const pubBuf = Buffer.from(vapidKeys.publicKey, 'base64url');
  const privBuf = Buffer.from(vapidKeys.privateKey, 'base64url');
  if (pubBuf.length !== 65 || pubBuf[0] !== 0x04 || privBuf.length !== 32) {
    throw new Error('Kunci VAPID tidak valid untuk kurva P-256.');
  }

  const keyObj = crypto.createPrivateKey({
    key: {
      kty: 'EC',
      crv: 'P-256',
      x: pubBuf.subarray(1, 33).toString('base64url'),
      y: pubBuf.subarray(33, 65).toString('base64url'),
      d: privBuf.toString('base64url'),
    },
    format: 'jwk',
  });

  const signature = crypto.sign('sha256', Buffer.from(signingInput, 'utf8'), {
    key: keyObj,
    dsaEncoding: 'ieee-p1363',
  });
  const jwt = `${signingInput}.${signature.toString('base64url')}`;
  return `vapid t=${jwt}, k=${vapidKeys.publicKey}`;
}

export function encryptWebPushPayload({ payloadJson, p256dhBase64Url, authBase64Url }) {
  const uaPublic = Buffer.from(p256dhBase64Url, 'base64url');
  const authSecret = Buffer.from(authBase64Url, 'base64url');
  if (uaPublic.length !== 65 || uaPublic[0] !== 0x04) {
    throw new Error('Kunci publik perangkat p256dh tidak valid.');
  }
  if (authSecret.length < 16) {
    throw new Error('Token auth push perangkat tidak valid.');
  }

  const as = crypto.createECDH('prime256v1');
  as.generateKeys();
  const asPublic = as.getPublicKey();
  const sharedSecret = as.computeSecret(uaPublic);
  const salt = crypto.randomBytes(16);

  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\x00', 'utf8'), uaPublic, asPublic]);
  const ikm = Buffer.from(crypto.hkdfSync('sha256', sharedSecret, authSecret, keyInfo, 32));

  const cek = Buffer.from(
    crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\x00', 'utf8'), 16)
  );
  const nonce = Buffer.from(
    crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\x00', 'utf8'), 12)
  );

  const plaintext = typeof payloadJson === 'string' ? payloadJson : JSON.stringify(payloadJson);
  const padded = Buffer.concat([Buffer.from(plaintext, 'utf8'), Buffer.from([0x02])]);

  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const encrypted = Buffer.concat([cipher.update(padded), cipher.final(), cipher.getAuthTag()]);

  const header = Buffer.alloc(16 + 4 + 1 + asPublic.length);
  salt.copy(header, 0);
  header.writeUInt32BE(4096, 16);
  header.writeUInt8(asPublic.length, 20);
  asPublic.copy(header, 21);

  return {
    body: Buffer.concat([header, encrypted]),
    asPublicKey: asPublic.toString('base64url'),
    salt: salt.toString('base64url'),
  };
}

export async function sendWebPushNotification({
  subscription,
  payload,
  vapidKeys,
  ttlSeconds = 3600,
  transport = fetch,
}) {
  // F6-AC3: pastikan payload notifikasi eksternal selalu netral tanpa isi jurnal, skor, atau kata sensitif
  const safePayload = {
    title: String(payload?.title || 'TENANGIN.ID'),
    body: String(payload?.body || 'Ada jeda singkat untuk dirimu hari ini?'),
    tag: String(payload?.tag || 'tenangin-reminder'),
    url: String(payload?.url || '/app'),
  };

  const { body } = encryptWebPushPayload({
    payloadJson: JSON.stringify(safePayload),
    p256dhBase64Url: subscription.p256dh,
    authBase64Url: subscription.auth,
  });

  const authorization = buildVapidAuthHeader({
    endpoint: subscription.endpoint,
    vapidKeys,
    ttlSeconds,
  });

  const res = await transport(subscription.endpoint, {
    method: 'POST',
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      TTL: String(ttlSeconds),
      Urgency: 'normal',
    },
    body,
  });

  const status = Number(res?.status || 0);
  return {
    ok: status >= 200 && status < 300,
    status,
    expired: status === 404 || status === 410,
  };
}
