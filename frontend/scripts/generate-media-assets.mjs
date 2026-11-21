import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');
const audioDir = path.join(publicDir, 'audio');
const iconsDir = path.join(publicDir, 'icons');

function writeWavFile(filePath, { durationSec = 4, tones = [261.63, 329.63, 392.0] }) {
  const sampleRate = 8000;
  const numSamples = sampleRate * durationSec;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const toneIdx = Math.min(tones.length - 1, Math.floor((t / durationSec) * tones.length));
    const segmentLen = durationSec / tones.length;
    const localT = t % segmentLen;
    const attack = Math.min(1, localT / 0.15);
    const decay = Math.exp(-2.2 * localT);
    const envelope = attack * decay;
    const freq = tones[toneIdx];
    const wave = 0.65 * Math.sin(2 * Math.PI * freq * t) + 0.35 * Math.sin(2 * Math.PI * (freq * 0.5) * t);
    const sample = Math.max(-1, Math.min(1, wave * envelope * 0.22));
    buffer.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
  }

  fs.writeFileSync(filePath, buffer);
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function writeBrandPng(filePath, size) {
  const raw = Buffer.alloc(size * (1 + size * 4));
  const center = size / 2;
  const radius = size * 0.44;
  const limeCx = size * 0.68;
  const limeCy = size * 0.34;
  const limeR = size * 0.12;

  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4);
    raw[rowStart] = 0;
    for (let x = 0; x < size; x++) {
      const idx = rowStart + 1 + x * 4;
      const dx = Math.abs(x - center);
      const dy = Math.abs(y - center);
      const inner = size * 0.28;
      const edgeDist =
        Math.hypot(Math.max(dx - inner, 0), Math.max(dy - inner, 0)) - (radius - inner);

      if (edgeDist > 1.5) {
        raw[idx] = 0;
        raw[idx + 1] = 0;
        raw[idx + 2] = 0;
        raw[idx + 3] = 0;
        continue;
      }

      // Latar ungu brand #6D35CF (109, 53, 207)
      let r = 109;
      let g = 53;
      let b = 207;

      const cloudDist = Math.min(
        Math.hypot(x - size * 0.46, y - size * 0.56) - size * 0.18,
        Math.hypot(x - size * 0.6, y - size * 0.58) - size * 0.14,
        Math.hypot(x - size * 0.35, y - size * 0.6) - size * 0.13
      );
      if (cloudDist <= 0) {
        r = 255;
        g = 255;
        b = 255;
      }

      if (Math.hypot(x - limeCx, y - limeCy) <= limeR) {
        r = 199;
        g = 244;
        b = 59;
      }

      raw[idx] = r;
      raw[idx + 1] = g;
      raw[idx + 2] = b;
      raw[idx + 3] = 255;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const compressed = zlib.deflateSync(raw, { level: 6 });
  const png = Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(filePath, png);
}

fs.mkdirSync(audioDir, { recursive: true });
fs.mkdirSync(iconsDir, { recursive: true });

writeWavFile(path.join(audioDir, 'napas-terpandu-4-4-4.wav'), {
  durationSec: 4,
  tones: [220.0, 277.18, 329.63, 220.0],
});
writeWavFile(path.join(audioDir, 'relaksasi-otot-progresif.wav'), {
  durationSec: 4,
  tones: [196.0, 246.94, 293.66],
});
writeWavFile(path.join(audioDir, 'mindfulness-5-4-3-2-1.wav'), {
  durationSec: 4,
  tones: [261.63, 329.63, 392.0, 523.25],
});

writeBrandPng(path.join(iconsDir, 'icon-192.png'), 192);
writeBrandPng(path.join(iconsDir, 'icon-512.png'), 512);

console.log('Aset audio & ikon internal berhasil dibuat di frontend/public/');
