/**
 * 接口集成测试：起一个真实 HTTP 服务，打到临时数据库。
 * 覆盖幂等、跨企业隔离、拜访次数、排行形状、导出权限与留痕。
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.HX_DB = join(mkdtempSync(join(tmpdir(), 'hx-test-')), 'test.db');

const { handle } = await import('../src/api.js');
await import('../src/seed.js');

const server = createServer((req, res) => handle(req, res));
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

test.after(() => server.close());

async function api(path, { user = 'u_lin', method = 'GET', body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { 'x-test-user': user, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

const key = () => 'k-' + Math.random().toString(36).slice(2, 10);

test('健康检查与今日任务', async () => {
  assert.equal((await api('/api/health', { user: '' })).status, 200);
  const r = await api('/api/today');
  assert.equal(r.status, 200);
  assert.equal(r.data.tasks.length, 4);
  assert.ok(r.data.tasks.every((t) => typeof t.done === 'boolean'));
});

test('未带测试身份 → 401', async () => {
  const r = await api('/api/today', { user: '' });
  assert.equal(r.status, 401);
  assert.equal(r.data.error.code, 'unauthenticated');
});

test('提交晨跑 → 201，并在今日任务里可见', async () => {
  const k = key();
  const r = await api('/api/actions', {
    method: 'POST',
    body: { kind: 'run', idempotencyKey: k, claimedAt: new Date().toISOString(), payload: { distanceKm: 4.2, minutes: 28, steps: 5600, imageRef: 'local:test' } },
  });
  assert.equal(r.status, 201);
  assert.equal(r.data.record.status, 'valid');
  const today = await api('/api/today');
  const run = today.data.tasks.find((t) => t.kind === 'run');
  assert.equal(run.done, true);
});

test('同一 idempotencyKey 重复提交 → 不产生第二条', async () => {
  const k = key();
  const body = { kind: 'read', idempotencyKey: k, claimedAt: new Date().toISOString(), payload: { readSeconds: 900, completed: true } };
  const a = await api('/api/actions', { method: 'POST', body });
  const b = await api('/api/actions', { method: 'POST', body });
  assert.equal(a.status, 201);
  assert.equal(b.status, 200);
  assert.equal(a.data.record.id, b.data.record.id);
  assert.equal(b.data.idempotent, true);
});

test('同日第二次拜访 → 409', async () => {
  const mk = () => api('/api/actions', {
    method: 'POST',
    body: { kind: 'visit', idempotencyKey: key(), claimedAt: new Date().toISOString(), payload: {} },
  });
  const first = await mk();
  assert.ok([201, 409].includes(first.status));
  if (first.status === 201) {
    const second = await mk();
    assert.equal(second.status, 409);
    assert.equal(second.data.error.code, 'visit_daily_limit');
  }
});

test('早起：窗口外提交被拒（422），不落库', async () => {
  const r = await api('/api/actions', {
    method: 'POST',
    body: { kind: 'early', idempotencyKey: key(), claimedAt: '2026-11-03T09:15:00.000+08:00', payload: {} },
  });
  assert.equal(r.status, 422);
  assert.equal(r.data.error.code, 'early_out_of_window');
});

test('跨企业：A 企业管理员看不到 B 企业记录', async () => {
  const a = await api('/api/admin/records', { user: 'u_alpha_admin' });
  assert.equal(a.status, 200);
  assert.ok(a.data.rows.length > 0);
  const b = await api('/api/admin/records', { user: 'u_beta_admin' });
  assert.equal(b.status, 200);
  const aUsers = new Set(a.data.rows.map((r) => r.userName));
  assert.ok(!aUsers.has('罗盘') && !aUsers.has('姜屿'), 'A 企业结果里不应出现 B 企业员工');
  const bUsers = new Set(b.data.rows.map((r) => r.userName));
  assert.ok(!bUsers.has('周予安'), 'B 企业结果里不应出现 A 企业员工');
});

test('跨企业加入团队 → 403', async () => {
  const r = await api('/api/teams/t_beta/join', { method: 'POST' });
  assert.equal(r.status, 403);
  assert.equal(r.data.error.code, 'cross_enterprise');
});

test('普通员工不能看全企业记录、不能导出', async () => {
  assert.equal((await api('/api/admin/records', { user: 'u_zhou' })).status, 403);
  assert.equal((await api('/api/admin/export.csv', { user: 'u_zhou' })).status, 403);
});

test('管理员导出 CSV 且写入导出日志', async () => {
  const res = await fetch(base + '/api/admin/export.csv', { headers: { 'x-test-user': 'u_alpha_admin' } });
  const csv = await res.text();
  assert.equal(res.status, 200);
  assert.ok(csv.includes('日期') && csv.includes('周予安'));

  const { getDb } = await import('../src/db.js');
  const n = getDb().prepare('SELECT COUNT(*) AS n FROM export_logs').get().n;
  assert.equal(n, 1);
  const log = getDb().prepare('SELECT * FROM export_logs LIMIT 1').get();
  assert.equal(log.actor_id, 'u_alpha_admin');
  assert.ok(log.row_count > 0);
});

test('排行：单项目、只在小范围，且不提供综合分', async () => {
  const team = await api('/api/rankings?scope=team&metric=early_count&period=day', { user: 'u_zhou' });
  assert.equal(team.status, 200);
  assert.equal(team.data.metric, 'early_count');
  assert.ok(Array.isArray(team.data.rows));

  const ent = await api('/api/rankings?scope=enterprise&metric=early_count&period=week', { user: 'u_zhou' });
  assert.equal(ent.status, 200);
  assert.ok(ent.data.rows.length >= 2);
  for (let i = 1; i < ent.data.rows.length; i++) {
    assert.ok(ent.data.rows[i - 1].value >= ent.data.rows[i].value, '按值降序');
  }

  const bad = await api('/api/rankings?scope=team&metric=composite', { user: 'u_zhou' });
  assert.equal(bad.status, 422);
  assert.equal(bad.data.error.code, 'metric_unknown');

  const cross = await api('/api/rankings?scope=national', { user: 'u_zhou' });
  assert.equal(cross.status, 422);
});

test('未入队查看小组榜 → 空榜且带说明，不报错', async () => {
  const r = await api('/api/rankings?scope=team', { user: 'u_lin' });
  assert.equal(r.status, 200);
  assert.equal(r.data.rows.length, 0);
  assert.match(r.data.note || '', /未加入团队/);
});

