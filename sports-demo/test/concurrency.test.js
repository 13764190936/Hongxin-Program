import test from 'node:test';
import assert from 'node:assert/strict';
import { HttpError } from '../server/errors.js';
import { startTestServer, request, PNG_A, PNG_B } from './helpers.js';

// 延迟分析器：让请求在 analyze() 中等待，以便用真实 HTTP 制造并发窗口。
function createGatedAnalyzer() {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const calls = [];
  return {
    id: 'gated-mock',
    label: 'GATED MOCK',
    calls,
    release,
    async analyze({ submitted }) {
      calls.push(submitted);
      await gate;
      return {
        mode: 'mock',
        mock: true,
        distanceKm: submitted.distanceKm,
        minutes: submitted.minutes,
        confidence: null,
        note: 'MOCK：延迟分析器（并发测试），未进行真实 OCR',
      };
    },
  };
}

// 第一次分析失败、之后成功：验证失败不会留下幂等占位或缓存错误。
function createFailOnceAnalyzer() {
  let attempts = 0;
  return {
    id: 'fail-once-mock',
    label: 'FAIL-ONCE MOCK',
    get attempts() {
      return attempts;
    },
    async analyze({ submitted }) {
      attempts += 1;
      if (attempts === 1) throw new HttpError(503, 'ANALYZER_UNAVAILABLE', '模拟分析器暂时不可用');
      return {
        mode: 'mock',
        mock: true,
        distanceKm: submitted.distanceKm,
        minutes: submitted.minutes,
        confidence: null,
        note: 'MOCK：失败一次后恢复正常（并发测试）',
      };
    },
  };
}

async function waitFor(predicate, label, timeoutMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`等待超时：${label}`);
}

const runBody = (image, overrides = {}) => ({
  imageBase64: image.toString('base64'),
  filename: 'run.png',
  distanceKm: 5,
  minutes: 30,
  ...overrides,
});

function postRun(base, user, key, body) {
  return request(base, '/api/runs', { method: 'POST', user, idem: key, body });
}

function runsOf(server, userId, day = '2026-11-04') {
  return server.repo.listRuns().filter((run) => run.userId === userId && run.day === day);
}

test('并发同 Key 同请求体：只执行一次，两个响应共享同一条记录', async (t) => {
  const analyzer = createGatedAnalyzer();
  const server = await startTestServer({ analyzer });
  t.after(() => server.close());

  const body = runBody(PNG_A);
  const first = postRun(server.base, 'u-anna', 'conc-same', body);
  await waitFor(() => analyzer.calls.length === 1, '第一个请求进入分析器');

  const second = postRun(server.base, 'u-anna', 'conc-same', body);
  await new Promise((resolve) => setTimeout(resolve, 60));

  analyzer.release();
  const [a, b] = await Promise.all([first, second]);

  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  assert.equal(a.data.run.id, b.data.run.id);
  assert.equal(a.data.replayed, false);
  assert.equal(b.data.replayed, true, '等待共享结果的请求标记为回放');

  const runs = runsOf(server, 'u-anna');
  assert.equal(runs.length, 1, '同 Key 同体并发只产生一条记录');
  assert.equal(runs[0].id, a.data.run.id);
});

test('并发同 Key 不同请求体：占位期间立即 409，原请求仍正常完成', async (t) => {
  const analyzer = createGatedAnalyzer();
  const server = await startTestServer({ analyzer });
  t.after(() => server.close());

  const first = postRun(server.base, 'u-anna', 'conc-changed', runBody(PNG_A));
  await waitFor(() => analyzer.calls.length === 1, '第一个请求进入分析器');

  const conflict = await postRun(server.base, 'u-anna', 'conc-changed', runBody(PNG_B));
  assert.equal(conflict.status, 409);
  assert.equal(conflict.data.error.code, 'IDEMPOTENCY_CONFLICT');

  analyzer.release();
  const a = await first;
  assert.equal(a.status, 200);
  assert.equal(runsOf(server, 'u-anna').length, 1);
});

test('并发同人同日不同 Key/图片：分析器之后只允许一条记录', async (t) => {
  const analyzer = createGatedAnalyzer();
  const server = await startTestServer({ analyzer });
  t.after(() => server.close());

  const first = postRun(server.base, 'u-anna', 'conc-day-1', runBody(PNG_A));
  const second = postRun(server.base, 'u-anna', 'conc-day-2', runBody(PNG_B));
  await waitFor(() => analyzer.calls.length === 2, '两个请求都进入分析器');

  analyzer.release();
  const [r1, r2] = await Promise.all([first, second]);
  assert.deepEqual([r1.status, r2.status].sort((a, b) => a - b), [200, 409]);

  const loser = r1.status === 409 ? r1 : r2;
  assert.equal(loser.data.error.code, 'RUN_ALREADY_CHECKED_IN');
  assert.equal(runsOf(server, 'u-anna').length, 1, '同日并发只落一条跑步记录');
});

test('并发跨身份同图片：只允许一条记录，另一条 IMAGE_ALREADY_USED', async (t) => {
  const analyzer = createGatedAnalyzer();
  const server = await startTestServer({ analyzer });
  t.after(() => server.close());

  const first = postRun(server.base, 'u-anna', 'conc-sha-a', runBody(PNG_A));
  const second = postRun(server.base, 'u-dee', 'conc-sha-b', runBody(PNG_A));
  await waitFor(() => analyzer.calls.length === 2, '两个请求都进入分析器');

  analyzer.release();
  const [r1, r2] = await Promise.all([first, second]);
  assert.deepEqual([r1.status, r2.status].sort((a, b) => a - b), [200, 409]);

  const loser = r1.status === 409 ? r1 : r2;
  assert.equal(loser.data.error.code, 'IMAGE_ALREADY_USED');
  const winner = r1.status === 200 ? r1 : r2;
  assert.equal(
    server.repo.listRuns().filter((run) => run.sha256 === winner.data.run.sha256).length,
    1,
    '同一图片字节在演示范围内只落一条记录',
  );
});

test('失败请求释放幂等占位：同一 Key 重试可执行，之后正常回放', async (t) => {
  const analyzer = createFailOnceAnalyzer();
  const server = await startTestServer({ analyzer });
  t.after(() => server.close());

  const body = runBody(PNG_A);
  const failed = await postRun(server.base, 'u-anna', 'retry-after-fail', body);
  assert.equal(failed.status, 503);
  assert.equal(failed.data.error.code, 'ANALYZER_UNAVAILABLE');
  assert.equal(server.repo.getIdempotency('u-anna:POST /api/runs:retry-after-fail'), null);
  assert.equal(runsOf(server, 'u-anna').length, 0);

  const retry = await postRun(server.base, 'u-anna', 'retry-after-fail', body);
  assert.equal(retry.status, 200);
  assert.equal(retry.data.replayed, false);
  assert.equal(analyzer.attempts, 2, '重试真正重新执行了处理逻辑');
  assert.equal(runsOf(server, 'u-anna').length, 1);

  const replay = await postRun(server.base, 'u-anna', 'retry-after-fail', body);
  assert.equal(replay.status, 200);
  assert.equal(replay.data.replayed, true);
  assert.equal(replay.data.run.id, retry.data.run.id);
  assert.equal(runsOf(server, 'u-anna').length, 1);
});
