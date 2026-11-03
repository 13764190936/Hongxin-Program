import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, ValidationError, SKEW_TOLERANCE_MS } from '../src/rules.js';

const nowIso = () => new Date().toISOString();

test('early：窗口内且无明显偏差 → valid', () => {
  const claimed = '2026-11-03T05:31:20.000+08:00';
  const received = new Date('2026-11-03T05:31:22.000+08:00');
  const r = evaluate('early', { claimedAt: claimed, receivedAt: received, payload: {} });
  assert.equal(r.status, 'valid');
  assert.equal(r.bizDate, '2026-11-03');
});

test('early：窗口外 → 抛 422', () => {
  assert.throws(
    () => evaluate('early', { claimedAt: '2026-11-03T05:30:59.999+08:00', receivedAt: new Date(), payload: {} }),
    (e) => e instanceof ValidationError && e.code === 'early_out_of_window',
  );
});

test('early：客户端时刻与服务端相差过大 → 转待核而非拒绝（Q3 决策的代价）', () => {
  const claimed = '2026-11-03T05:31:20.000+08:00';
  const received = new Date('2026-11-03T13:00:00.000+08:00');
  const r = evaluate('early', { claimedAt: claimed, receivedAt: received, payload: {} });
  assert.equal(r.status, 'pending_review');
  assert.match(r.reviewReason, /client_clock_behind/);
  assert.ok(r.receivedDelayMs > SKEW_TOLERANCE_MS);
});

test('claimedAt 必须带时区', () => {
  assert.throws(
    () => evaluate('run', { claimedAt: '2026-11-03 06:40:00', receivedAt: new Date(), payload: {} }),
    (e) => e.code === 'claimedAt_no_offset',
  );
});

test('run：数值校验', () => {
  const base = { claimedAt: nowIso(), receivedAt: new Date() };
  assert.throws(
    () => evaluate('run', { ...base, payload: { distanceKm: 3, minutes: 20, steps: 3000 } }),
    (e) => e.code === 'image_required',
  );
  assert.throws(
    () => evaluate('run', { ...base, payload: { distanceKm: -1, minutes: 20, steps: 3000, imageRef: 'x' } }),
    (e) => e.code === 'distanceKm_range',
  );
  assert.throws(
    () => evaluate('run', { ...base, payload: { distanceKm: 3, minutes: 20, steps: 30.5, imageRef: 'x' } }),
    (e) => e.code === 'steps_not_integer',
  );
  const ok = evaluate('run', { ...base, payload: { distanceKm: 3.2, minutes: 26, steps: 4280, imageRef: 'local:abc' } });
  assert.equal(ok.status, 'valid');
  assert.deepEqual(ok.metrics, { distanceKm: 3.2, minutes: 26, steps: 4280 });
});

test('run：OCR 为模拟时打标，不让它冒充真实识别', () => {
  const r = evaluate('run', {
    claimedAt: nowIso(), receivedAt: new Date(),
    payload: { distanceKm: 3.2, minutes: 26, steps: 4280, imageRef: 'x', ocrMock: true },
  });
  assert.match(r.reviewReason || '', /ocr_is_mock/);
});

test('read：时长不足 60 秒拒收；完成声明与时长分开', () => {
  const base = { claimedAt: nowIso(), receivedAt: new Date() };
  assert.throws(() => evaluate('read', { ...base, payload: { readSeconds: 59 } }), (e) => e.code === 'read_too_short');
  const r = evaluate('read', { ...base, payload: { readSeconds: 600, completed: false } });
  assert.equal(r.status, 'valid');
  assert.equal(r.metrics.completed, false);
  assert.equal(r.metrics.readSeconds, 600);
  assert.equal(r.reviewReason, null, '未勾选完成属业务结果，不进待核');
});

test('未知行动类型直接拒收', () => {
  assert.throws(() => evaluate('dance', { claimedAt: nowIso(), receivedAt: new Date(), payload: {} }), (e) => e.code === 'kind_unknown');
});
