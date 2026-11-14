import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { HttpError, assert } from './errors.js';
import { findUser, publicIdentities, teams, org } from './fixtures.js';
import { fixtureOverview } from './seed.js';
import { createStepService } from './services/stepService.js';
import { createRunService } from './services/runService.js';
import { createRankService } from './services/rankService.js';

const PUBLIC_DIR = fileURLToPath(new URL('../public', import.meta.url));
const LOCAL_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

function sendError(res, error) {
  const status = error instanceof HttpError ? error.status : 500;
  const payload = {
    demo: true,
    error: {
      code: error instanceof HttpError ? error.code : 'INTERNAL_ERROR',
      message: error instanceof HttpError ? error.message : '服务器内部错误',
      ...(error?.details ? { details: error.details } : {}),
    },
  };
  if (!(error instanceof HttpError)) console.error('[sports-demo]', error);
  sendJson(res, status, payload);
}

async function readRawBody(req, limit) {
  const declared = Number(req.headers['content-length'] || 0);
  if (declared > limit) {
    throw new HttpError(413, 'BODY_TOO_LARGE', '请求体过大，请上传更小的截图');
  }
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > limit) {
      throw new HttpError(413, 'BODY_TOO_LARGE', '请求体过大，请上传更小的截图');
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function parseJson(raw) {
  try {
    const value = JSON.parse(raw || '{}');
    assert(value !== null && typeof value === 'object' && !Array.isArray(value), 400, 'JSON_OBJECT_REQUIRED', '请求体必须是 JSON 对象');
    return value;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'INVALID_JSON', '请求体不是有效的 JSON');
  }
}

function resolveIdentity(req, { required = false } = {}) {
  const raw = req.headers['x-demo-user'];
  if (raw === undefined || raw === '') {
    if (required) throw new HttpError(401, 'IDENTITY_REQUIRED', '请先选择演示身份');
    return null;
  }
  const user = findUser(String(raw));
  if (!user) {
    throw new HttpError(403, 'IDENTITY_UNKNOWN', '未知演示身份，请从页面提供的身份列表中选择');
  }
  return user;
}

function isLocalRequest(req) {
  return LOCAL_ADDRESSES.has(req.socket.remoteAddress || '');
}

async function serveStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', '该地址只支持 GET');
  }
  let relative;
  try {
    relative = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
  } catch {
    throw new HttpError(400, 'PATH_INVALID', '请求路径无效');
  }
  const filePath = path.normalize(path.join(PUBLIC_DIR, relative));
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) {
    throw new HttpError(403, 'PATH_FORBIDDEN', '不允许访问该路径');
  }
  let stat;
  try {
    stat = await fs.promises.stat(filePath);
  } catch {
    throw new HttpError(404, 'NOT_FOUND', '页面不存在');
  }
  if (!stat.isFile()) throw new HttpError(404, 'NOT_FOUND', '页面不存在');

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data: blob:; style-src 'self'; script-src 'self'",
  });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  fs.createReadStream(filePath).pipe(res);
}

export function createApp({ repo, clock, config, seed, stepSource, analyzer }) {
  const stepService = createStepService({ repo, clock, stepSource });
  const runService = createRunService({ repo, clock, analyzer, config });
  const rankService = createRankService({ repo, clock, config });

  function buildMe(user) {
    const day = clock.today();
    const history = repo
      .listStepsByUser(user.id)
      .sort((a, b) => (a.day < b.day ? 1 : -1))
      .map((r) => ({ day: r.day, steps: r.steps, source: r.source }));
    return {
      day,
      user: { id: user.id, name: user.name, role: user.role },
      team: teams.find((t) => t.id === user.teamId) ?? null,
      todaySteps: stepService.todaySteps(user.id),
      totalSteps: stepService.totalSteps(user.id),
      todayRun: runService.getTodayRun(user.id),
      history,
      mock: true,
    };
  }

  // 同一“身份 + 路由 + Key”的并发写：第一个请求占位并执行，其余相同请求体
  // 等待共享结果；不同请求体立即 409。失败时释放占位，允许重试重新执行。
  const inFlightWrites = new Map();

  async function handleIdempotentWrite(req, res, routeKey, user, raw, handler) {
    const key = req.headers['idempotency-key'];
    assert(
      typeof key === 'string' && key.trim().length > 0,
      400,
      'IDEMPOTENCY_KEY_REQUIRED',
      '写操作需要 Idempotency-Key 请求头，用于防止重复提交',
    );
    assert(
      key.trim().length <= config.maxIdempotencyKeyLength,
      400,
      'IDEMPOTENCY_KEY_INVALID',
      'Idempotency-Key 过长',
    );

    const storeKey = `${user.id}:${routeKey}:${key.trim()}`;
    const requestHash = crypto.createHash('sha256').update(raw).digest('hex');

    for (;;) {
      const existing = repo.getIdempotency(storeKey);
      if (existing) {
        if (existing.requestHash !== requestHash) {
          throw new HttpError(
            409,
            'IDEMPOTENCY_CONFLICT',
            '同一 Idempotency-Key 提交了不同内容，已拒绝；请换一个 Key 重新提交',
          );
        }
        sendJson(res, existing.status, { ...existing.body, replayed: true });
        return;
      }

      const pending = inFlightWrites.get(storeKey);
      if (!pending) break;
      if (pending.requestHash !== requestHash) {
        throw new HttpError(
          409,
          'IDEMPOTENCY_CONFLICT',
          '同一 Idempotency-Key 提交了不同内容，已拒绝；请换一个 Key 重新提交',
        );
      }
      let shared;
      try {
        shared = await pending.promise;
      } catch {
        // 前一个同请求失败且已释放占位，重新争取执行。
        continue;
      }
      sendJson(res, 200, { ...shared, replayed: true });
      return;
    }

    const body = parseJson(raw);
    const work = (async () => {
      const result = await handler(body);
      const payload = { ...result, replayed: false };
      repo.putIdempotency(storeKey, { requestHash, status: 200, body: payload });
      return payload;
    })();
    // finally 在 promise 结算前清理占位，等待者被唤醒时不会看到已失败的旧占位。
    const guarded = work.finally(() => {
      if (inFlightWrites.get(storeKey)?.promise === guarded) inFlightWrites.delete(storeKey);
    });
    inFlightWrites.set(storeKey, { requestHash, promise: guarded });

    const payload = await guarded;
    sendJson(res, 200, payload);
  }

  async function route(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname;

    if (!pathname.startsWith('/api/')) {
      await serveStatic(req, res, pathname);
      return;
    }

    if (pathname === '/api/health' && req.method === 'GET') {
      sendJson(res, 200, {
        ok: true,
        service: 'hongxin-sports-demo',
        demo: true,
        mock: true,
        day: clock.today(),
        timezone: clock.timezone,
        pid: process.pid,
      });
      return;
    }

    if (pathname === '/api/meta' && req.method === 'GET') {
      const identity = resolveIdentity(req);
      sendJson(res, 200, {
        demo: true,
        mock: true,
        day: clock.today(),
        timezone: clock.timezone,
        org,
        ...fixtureOverview(),
        identities: publicIdentities(),
        currentIdentity: identity?.id ?? null,
        teamAggregation: config.teamAggregation,
        duplicateScope: config.duplicateScope,
        maxImageBytes: config.maxImageBytes,
        notices: [
          '本地一次性演示：虚构身份、虚构数据，无登录、无用户数据库',
          '步数为模拟微信快照；跑步截图为 MOCK 分析，不做真实 OCR',
          '数据保存在服务进程内存，重启即重置（日期也恢复真实日期）',
          '当日团队榜默认按成员数值求和，仅是演示策略',
        ],
        mockAnalyzer: { id: analyzer.id, label: analyzer.label },
        mockStepSource: { id: stepSource.id, label: stepSource.label },
      });
      return;
    }

    if (pathname === '/api/identities' && req.method === 'GET') {
      sendJson(res, 200, { identities: publicIdentities() });
      return;
    }

    if (pathname === '/api/me' && req.method === 'GET') {
      const user = resolveIdentity(req, { required: true });
      sendJson(res, 200, buildMe(user));
      return;
    }

    if (pathname === '/api/boards' && req.method === 'GET') {
      resolveIdentity(req);
      const metric = url.searchParams.get('metric') || 'steps';
      assert(
        metric === 'steps' || metric === 'run',
        400,
        'METRIC_INVALID',
        'metric 只支持 steps（步数）或 run（跑步距离）',
      );
      sendJson(res, 200, rankService.build(metric));
      return;
    }

    if (pathname === '/api/steps/mock-sync' && req.method === 'POST') {
      const user = resolveIdentity(req, { required: true });
      const raw = await readRawBody(req, config.maxBodyBytes);
      await handleIdempotentWrite(req, res, 'POST /api/steps/mock-sync', user, raw, async (body) => {
        return stepService.syncMockSnapshot(user, body);
      });
      return;
    }

    if (pathname === '/api/runs' && req.method === 'POST') {
      const user = resolveIdentity(req, { required: true });
      const raw = await readRawBody(req, config.maxBodyBytes);
      await handleIdempotentWrite(req, res, 'POST /api/runs', user, raw, async (body) => {
        return runService.checkIn(user, body);
      });
      return;
    }

    if (pathname === '/api/demo/next-day' && req.method === 'POST') {
      assert(isLocalRequest(req), 403, 'LOCAL_ONLY', '演示日期只能在本机操作');
      const raw = await readRawBody(req, config.maxBodyBytes);
      if (raw.trim()) parseJson(raw);
      const day = clock.advanceDays(1);
      sendJson(res, 200, {
        ok: true,
        day,
        notice: '演示日期已前进一天。所有接口统一使用服务端日期；重启服务恢复真实日期。',
      });
      return;
    }

    if (pathname === '/api/demo/reset' && req.method === 'POST') {
      assert(isLocalRequest(req), 403, 'LOCAL_ONLY', '演示数据只能在本机重置');
      const raw = await readRawBody(req, config.maxBodyBytes);
      const body = parseJson(raw);
      assert(
        body.confirm === config.resetConfirmToken,
        400,
        'RESET_CONFIRM_REQUIRED',
        `重置需要确认字符串 ${config.resetConfirmToken}`,
      );
      repo.reset();
      clock.reset();
      seed(repo, clock);
      sendJson(res, 200, {
        ok: true,
        day: clock.today(),
        notice: '演示数据已重置，日期恢复为真实日期，内存数据重新播种。',
      });
      return;
    }

    const known = {
      '/api/health': ['GET'],
      '/api/meta': ['GET'],
      '/api/identities': ['GET'],
      '/api/me': ['GET'],
      '/api/boards': ['GET'],
      '/api/steps/mock-sync': ['POST'],
      '/api/runs': ['POST'],
      '/api/demo/next-day': ['POST'],
      '/api/demo/reset': ['POST'],
    }[pathname];
    if (known) {
      throw new HttpError(405, 'METHOD_NOT_ALLOWED', `该接口只支持 ${known.join('、')}`);
    }
    throw new HttpError(404, 'NOT_FOUND', '接口不存在');
  }

  async function handler(req, res) {
    try {
      await route(req, res);
    } catch (error) {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      sendError(res, error);
    }
  }

  return { handler, repo, clock, services: { stepService, runService, rankService } };
}

export function createHttpServer(app) {
  return http.createServer(app.handler);
}
