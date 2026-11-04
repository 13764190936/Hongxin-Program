import http from 'node:http';
import zlib from 'node:zlib';
import { createApp } from '../server/app.js';
import { createDemoClock } from '../server/clock.js';
import { createMemoryRepository } from '../server/store.js';
import { seedDemoData } from '../server/seed.js';
import { createMockStepSource } from '../server/adapters/mockStepSource.js';
import { createMockRunAnalyzer } from '../server/adapters/mockRunAnalyzer.js';
import { config as baseConfig } from '../server/config.js';

export const FIXED_NOW = Date.parse('2026-11-04T02:00:00Z'); // 上海时间 2026-11-04 10:00

export async function startTestServer({ analyzer = createMockRunAnalyzer() } = {}) {
  const config = { ...baseConfig, port: 0 };
  const clock = createDemoClock({ timezone: config.timezone, now: () => FIXED_NOW });
  const repo = createMemoryRepository();
  seedDemoData(repo, clock);
  const app = createApp({
    repo,
    clock,
    config,
    seed: seedDemoData,
    stepSource: createMockStepSource(),
    analyzer,
  });
  const server = http.createServer(app.handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  return {
    base: `http://127.0.0.1:${port}`,
    repo,
    clock,
    app,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

export async function request(base, path, { method = 'GET', user, idem, body } = {}) {
  const headers = {};
  if (user) headers['x-demo-user'] = user;
  if (idem) headers['idempotency-key'] = idem;
  let payload;
  if (body !== undefined) {
    headers['content-type'] = 'application/json';
    payload = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const response = await fetch(base + path, { method, headers, body: payload });
  const text = await response.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }
  return { status: response.status, data, text, headers: response.headers };
}

// ---- 生成真实可解码的 1x1 PNG 字节（用于验证文件头与 SHA256，不依赖外部图片）----
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

export function makePng(r, g, b) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0);
  ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.from([0, r, g, b, 255]);
  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

export const PNG_A = makePng(220, 40, 40);
export const PNG_B = makePng(30, 90, 220);

export function submitRun(base, user, { key, image = PNG_A, distanceKm = 5, minutes = 30, filename = 'run.png' } = {}) {
  return request(base, '/api/runs', {
    method: 'POST',
    user,
    idem: key,
    body: { imageBase64: image.toString('base64'), filename, distanceKm, minutes },
  });
}

export function submitSteps(base, user, { key, steps }) {
  return request(base, '/api/steps/mock-sync', {
    method: 'POST',
    user,
    idem: key,
    body: { steps },
  });
}
