import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  startTestServer,
  request,
  submitSteps,
  submitRun,
  makePng,
  PNG_A,
  PNG_B,
} from './helpers.js';

async function withServer(t) {
  const server = await startTestServer();
  t.after(() => server.close());
  return server;
}

test('健康检查、页面与未知接口的 HTTP 行为', async (t) => {
  const { base } = await withServer(t);

  const health = await request(base, '/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.data.ok, true);
  assert.equal(health.data.demo, true);
  assert.equal(health.data.day, '2026-11-04');
  assert.equal(health.data.timezone, 'Asia/Shanghai');

  const page = await request(base, '/');
  assert.equal(page.status, 200);
  assert.match(page.text, /DEMO 演示/);
  assert.match(page.text, /MOCK/);

  const missing = await request(base, '/api/does-not-exist');
  assert.equal(missing.status, 404);
  assert.equal(missing.data.error.code, 'NOT_FOUND');

  const wrongMethod = await request(base, '/api/health', { method: 'POST', body: {} });
  assert.equal(wrongMethod.status, 405);
  assert.equal(wrongMethod.data.error.code, 'METHOD_NOT_ALLOWED');
});

test('步数是当日绝对快照：6000 后 8000 得 8000，历史总步数相应更新', async (t) => {
  const { base, repo } = await withServer(t);

  const meBefore = await request(base, '/api/me', { user: 'u-anna' });
  assert.equal(meBefore.status, 200);
  assert.equal(meBefore.data.todaySteps, 6800);
  assert.equal(meBefore.data.totalSteps, 6800 + 8200 + 9300);

  const first = await submitSteps(base, 'u-anna', { key: 'step-1', steps: 6000 });
  assert.equal(first.status, 200);
  assert.equal(first.data.todaySteps, 6000);
  assert.equal(first.data.disclaimer.includes('模拟'), true);
  assert.equal(first.data.record.source, 'mock-wechat-snapshot');

  const second = await submitSteps(base, 'u-anna', { key: 'step-2', steps: 8000 });
  assert.equal(second.status, 200);
  assert.equal(second.data.todaySteps, 8000);
  assert.equal(second.data.totalSteps, 8000 + 8200 + 9300);
  assert.equal(repo.listStepsByUser('u-anna').length, 3, '同一演示日只保留一条绝对快照');

  const boards = await request(base, '/api/boards?metric=steps');
  const anna = boards.data.personal.find((row) => row.userId === 'u-anna');
  assert.equal(anna.value, 8000);
});

test('幂等键：相同请求返回原结果，不同内容返回 409', async (t) => {
  const { base, repo } = await withServer(t);

  const body = { steps: 7000 };
  const first = await request(base, '/api/steps/mock-sync', {
    method: 'POST',
    user: 'u-anna',
    idem: 'retry-key-1',
    body,
  });
  assert.equal(first.status, 200);
  assert.equal(first.data.replayed, false);

  const replay = await request(base, '/api/steps/mock-sync', {
    method: 'POST',
    user: 'u-anna',
    idem: 'retry-key-1',
    body,
  });
  assert.equal(replay.status, 200);
  assert.equal(replay.data.replayed, true);
  assert.equal(replay.data.record.updatedAt, first.data.record.updatedAt);
  assert.equal(repo.listStepsByUser('u-anna').length, 3, '重试不产生重复记录');

  const conflict = await request(base, '/api/steps/mock-sync', {
    method: 'POST',
    user: 'u-anna',
    idem: 'retry-key-1',
    body: { steps: 9000 },
  });
  assert.equal(conflict.status, 409);
  assert.equal(conflict.data.error.code, 'IDEMPOTENCY_CONFLICT');

  const missingKey = await request(base, '/api/steps/mock-sync', {
    method: 'POST',
    user: 'u-anna',
    body: { steps: 9000 },
  });
  assert.equal(missingKey.status, 400);
  assert.equal(missingKey.data.error.code, 'IDEMPOTENCY_KEY_REQUIRED');
});

test('每日个人/团队步数榜顺序与并列名次明确', async (t) => {
  const { base } = await withServer(t);

  const steps = await request(base, '/api/boards?metric=steps');
  assert.equal(steps.status, 200);
  assert.deepEqual(
    steps.data.personal.map((row) => [row.name, row.value, row.rank]),
    [
      ['周博', 9200, 1],
      ['陈晨', 7400, 2],
      ['林晓', 6800, 3],
      ['丁一一', 5100, 4],
    ],
  );
  assert.deepEqual(
    steps.data.team.map((row) => [row.name, row.value, row.rank]),
    [
      ['鸿风先锋队', 16000, 1],
      ['鸿风追风队', 12500, 2],
    ],
  );
  assert.match(steps.data.tieRule, /并列/);

  const runBoard = await request(base, '/api/boards?metric=run');
  assert.deepEqual(
    runBoard.data.personal.map((row) => [row.name, row.value]),
    [
      ['周博', 4.2],
      ['陈晨', 2.6],
    ],
  );

  // 把周博改成 6800，与林晓并列；并列名次相同，后续名次跳号
  const tie = await submitSteps(base, 'u-bo', { key: 'tie-key', steps: 6800 });
  assert.equal(tie.status, 200);
  const tied = await request(base, '/api/boards?metric=steps');
  const rows = tied.data.personal;
  const anna = rows.find((row) => row.userId === 'u-anna');
  const bo = rows.find((row) => row.userId === 'u-bo');
  const dee = rows.find((row) => row.userId === 'u-dee');
  assert.equal(anna.rank, 2);
  assert.equal(bo.rank, 2);
  assert.equal(dee.rank, 4);
  assert.equal(tied.data.team.find((row) => row.teamId === 'team-alpha').value, 13600);

  // 团队也并列：林晓 5700 + 周博 6800 = 12500，与追风队相同
  const teamTie = await submitSteps(base, 'u-anna', { key: 'tie-team-key', steps: 5700 });
  assert.equal(teamTie.status, 200);
  const tiedTeams = (await request(base, '/api/boards?metric=steps')).data.team;
  const alpha = tiedTeams.find((row) => row.teamId === 'team-alpha');
  const beta = tiedTeams.find((row) => row.teamId === 'team-beta');
  assert.equal(alpha.value, 12500);
  assert.equal(beta.value, 12500);
  assert.equal(alpha.rank, 1);
  assert.equal(beta.rank, 1);
});

test('下一天：日榜清空、日期隔离、个人历史总步数保留', async (t) => {
  const { base, clock } = await withServer(t);

  const before = await request(base, '/api/me', { user: 'u-anna' });
  const totalBefore = before.data.totalSteps;

  const advance = await request(base, '/api/demo/next-day', { method: 'POST', body: {} });
  assert.equal(advance.status, 200);
  assert.equal(advance.data.day, '2026-11-05');

  const emptyBoards = await request(base, '/api/boards?metric=steps');
  assert.equal(emptyBoards.data.day, '2026-11-05');
  assert.deepEqual(emptyBoards.data.personal, []);
  assert.deepEqual(emptyBoards.data.team, []);

  const meNext = await request(base, '/api/me', { user: 'u-anna' });
  assert.equal(meNext.data.day, '2026-11-05');
  assert.equal(meNext.data.todaySteps, 0);
  assert.equal(meNext.data.totalSteps, totalBefore, '历史总步数不因跨天重置');
  assert.equal(meNext.data.history.length, 3);

  // 客户端夹带 day/userId 也不能决定服务端日期与身份
  const sync = await request(base, '/api/steps/mock-sync', {
    method: 'POST',
    user: 'u-anna',
    idem: 'next-day-step',
    body: { steps: 5000, day: '2020-01-01', userId: 'u-bo' },
  });
  assert.equal(sync.status, 200);
  assert.equal(sync.data.record.day, '2026-11-05');
  assert.equal(sync.data.record.userId, 'u-anna');
  assert.equal(sync.data.totalSteps, totalBefore + 5000);
  assert.equal(clock.today(), '2026-11-05');

  const boards = await request(base, '/api/boards?metric=steps');
  assert.equal(boards.data.personal.length, 1);
  assert.equal(boards.data.personal[0].userId, 'u-anna');
  assert.equal(boards.data.personal[0].value, 5000);
  assert.equal(
    boards.data.personal.some((row) => row.value === 6800),
    false,
    '前一天榜单不再参与当日榜单',
  );
});

test('跑步上传：真实文件字节、只计一次、跨人跨天复用同图被拒', async (t) => {
  const { base } = await withServer(t);

  const created = await submitRun(base, 'u-anna', { key: 'run-1' });
  assert.equal(created.status, 200);
  assert.equal(created.data.run.day, '2026-11-04');
  assert.equal(created.data.run.distanceKm, 5);
  assert.equal(created.data.run.mime, 'image/png');
  assert.equal(created.data.run.sha256, crypto.createHash('sha256').update(PNG_A).digest('hex'));
  assert.equal(created.data.validation.realOcr, false);
  assert.equal(created.data.run.analysisMode, 'mock');
  assert.match(created.data.run.analysis.note, /MOCK/);
  assert.equal(created.data.mock, true);

  const runBoard = await request(base, '/api/boards?metric=run');
  assert.equal(runBoard.data.personal.find((row) => row.userId === 'u-anna').value, 5);
  assert.equal(runBoard.data.team.find((row) => row.teamId === 'team-alpha').value, 9.2);

  // 同一人同一天换图也拒绝
  const samePersonNewImage = await submitRun(base, 'u-anna', { key: 'run-2', image: PNG_B });
  assert.equal(samePersonNewImage.status, 409);
  assert.equal(samePersonNewImage.data.error.code, 'RUN_ALREADY_CHECKED_IN');

  // 同一字节图片换人、换幂等键仍拒绝
  const crossPerson = await submitRun(base, 'u-dee', { key: 'run-3', image: PNG_A });
  assert.equal(crossPerson.status, 409);
  assert.equal(crossPerson.data.error.code, 'IMAGE_ALREADY_USED');

  const dee = await submitRun(base, 'u-dee', { key: 'run-4', image: PNG_B });
  assert.equal(dee.status, 200);
  assert.equal(
    (await request(base, '/api/boards?metric=run')).data.personal.find((row) => row.userId === 'u-dee').value,
    5,
  );

  // 进入下一天，历史图片仍在全局去重范围
  await request(base, '/api/demo/next-day', { method: 'POST', body: {} });
  const crossDay = await submitRun(base, 'u-anna', { key: 'run-5', image: PNG_A });
  assert.equal(crossDay.status, 409);
  assert.equal(crossDay.data.error.code, 'IMAGE_ALREADY_USED');
});

test('跑步幂等重试返回原记录，不会重复计分', async (t) => {
  const { base, repo } = await withServer(t);

  const body = {
    imageBase64: PNG_B.toString('base64'),
    filename: 'screenshot.png',
    distanceKm: 3.2,
    minutes: 21,
  };
  const first = await request(base, '/api/runs', {
    method: 'POST',
    user: 'u-anna',
    idem: 'run-retry',
    body,
  });
  assert.equal(first.status, 200);

  const replay = await request(base, '/api/runs', {
    method: 'POST',
    user: 'u-anna',
    idem: 'run-retry',
    body,
  });
  assert.equal(replay.status, 200);
  assert.equal(replay.data.replayed, true);
  assert.equal(replay.data.run.id, first.data.run.id);
  assert.equal(repo.listRunsByDay('2026-11-04').filter((r) => r.userId === 'u-anna').length, 1);

  const board = await request(base, '/api/boards?metric=run');
  assert.equal(board.data.personal.filter((row) => row.userId === 'u-anna').length, 1);
  assert.equal(board.data.personal.find((row) => row.userId === 'u-anna').value, 3.2);

  const conflict = await request(base, '/api/runs', {
    method: 'POST',
    user: 'u-anna',
    idem: 'run-retry',
    body: { ...body, imageBase64: makePng(1, 2, 3).toString('base64') },
  });
  assert.equal(conflict.status, 409);
  assert.equal(conflict.data.error.code, 'IDEMPOTENCY_CONFLICT');
});

test('无效身份、数字、图片与超大请求返回明确中文错误', async (t) => {
  const { base } = await withServer(t);

  for (const steps of [-1, 1.5, '100']) {
    const response = await submitSteps(base, 'u-anna', { key: `bad-${String(steps)}`, steps });
    assert.equal(response.status, 400);
    assert.equal(response.data.error.code, 'STEPS_INVALID');
    assert.match(response.data.error.message, /整数/);
  }

  const noIdentity = await request(base, '/api/me');
  assert.equal(noIdentity.status, 401);
  assert.equal(noIdentity.data.error.code, 'IDENTITY_REQUIRED');

  const unknownIdentity = await request(base, '/api/me', { user: 'u-attacker' });
  assert.equal(unknownIdentity.status, 403);
  assert.equal(unknownIdentity.data.error.code, 'IDENTITY_UNKNOWN');

  const noImage = await request(base, '/api/runs', {
    method: 'POST',
    user: 'u-anna',
    idem: 'no-image',
    body: { distanceKm: 5, minutes: 30 },
  });
  assert.equal(noImage.status, 400);
  assert.equal(noImage.data.error.code, 'IMAGE_REQUIRED');

  const badBase64 = await request(base, '/api/runs', {
    method: 'POST',
    user: 'u-anna',
    idem: 'bad-b64',
    body: { imageBase64: 'not-an-image!!', distanceKm: 5, minutes: 30 },
  });
  assert.equal(badBase64.status, 400);
  assert.equal(badBase64.data.error.code, 'IMAGE_ENCODING_INVALID');

  const fakeImage = await request(base, '/api/runs', {
    method: 'POST',
    user: 'u-anna',
    idem: 'fake-image',
    body: { imageBase64: Buffer.from('hello world, not a png').toString('base64'), filename: 'run.png', distanceKm: 5, minutes: 30 },
  });
  assert.equal(fakeImage.status, 400);
  assert.equal(fakeImage.data.error.code, 'IMAGE_TYPE_INVALID');
  assert.match(fakeImage.data.error.message, /文件内容/);

  const tooBigImage = Buffer.concat([
    PNG_A,
    Buffer.alloc(2 * 1024 * 1024 + 10, 0),
  ]);
  const oversizedImage = await submitRun(base, 'u-anna', { key: 'big-image', image: tooBigImage });
  assert.equal(oversizedImage.status, 413);
  assert.equal(oversizedImage.data.error.code, 'IMAGE_TOO_LARGE');

  const badDistance = await submitRun(base, 'u-anna', { key: 'bad-distance', distanceKm: -3 });
  assert.equal(badDistance.status, 400);
  assert.equal(badDistance.data.error.code, 'DISTANCE_INVALID');

  const badMinutes = await submitRun(base, 'u-anna', { key: 'bad-minutes', minutes: 0 });
  assert.equal(badMinutes.status, 400);
  assert.equal(badMinutes.data.error.code, 'MINUTES_INVALID');

  const stringDistance = await submitRun(base, 'u-anna', { key: 'string-distance', distanceKm: '5' });
  assert.equal(stringDistance.status, 400);
  assert.equal(stringDistance.data.error.code, 'DISTANCE_INVALID');

  const hugeBody = JSON.stringify({ imageBase64: 'A'.repeat(4 * 1024 * 1024 + 100) });
  const tooLargeBody = await request(base, '/api/runs', {
    method: 'POST',
    user: 'u-anna',
    idem: 'huge-body',
    body: hugeBody,
  });
  assert.equal(tooLargeBody.status, 413);
  assert.equal(tooLargeBody.data.error.code, 'BODY_TOO_LARGE');
});

test('MOCK 分析器有显式标注，不宣称真实 OCR 或真实跑步证明', async (t) => {
  const { base } = await withServer(t);

  const meta = await request(base, '/api/meta');
  assert.equal(meta.data.mock, true);
  assert.equal(meta.data.duplicateScope, 'global-demo');
  assert.match(JSON.stringify(meta.data.notices), /MOCK|模拟/);
  assert.match(meta.data.mockAnalyzer.label, /MOCK/);

  const run = await submitRun(base, 'u-anna', { key: 'mock-claim' });
  assert.equal(run.status, 200);
  assert.equal(run.data.run.analysis.mode, 'mock');
  assert.equal(run.data.run.analysis.mock, true);
  assert.equal(run.data.validation.realOcr, false);
  assert.match(run.data.validation.label, /MOCK/);
  const payload = JSON.stringify(run.data);
  assert.doesNotMatch(payload, /"realOcr":true|"mock":false|OCR 识别成功/);
  assert.match(run.data.run.analysis.note, /未进行真实 OCR/);
});

test('重置演示需要确认字符串，并重新播种与恢复真实日期', async (t) => {
  const { base } = await withServer(t);

  await request(base, '/api/demo/next-day', { method: 'POST', body: {} });
  await submitSteps(base, 'u-anna', { key: 'reset-step', steps: 12345 });

  const wrong = await request(base, '/api/demo/reset', { method: 'POST', body: { confirm: 'yes' } });
  assert.equal(wrong.status, 400);
  assert.equal(wrong.data.error.code, 'RESET_CONFIRM_REQUIRED');

  const reset = await request(base, '/api/demo/reset', { method: 'POST', body: { confirm: 'RESET' } });
  assert.equal(reset.status, 200);
  assert.equal(reset.data.day, '2026-11-04');

  const me = await request(base, '/api/me', { user: 'u-anna' });
  assert.equal(me.data.todaySteps, 6800);
  assert.equal(me.data.totalSteps, 6800 + 8200 + 9300);
});
