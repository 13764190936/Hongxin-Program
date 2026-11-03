import test from 'node:test';
import assert from 'node:assert/strict';
import { inEarlyWindow, bjDateStr, weekStartDate, addDays, msOfBjDay } from '../src/clock.js';

const at = (s) => new Date(s);

test('早起窗口：四个边界（半开区间）', () => {
  assert.equal(inEarlyWindow(at('2026-11-03T05:30:59.999+08:00')), false, '05:30:59.999 不算');
  assert.equal(inEarlyWindow(at('2026-11-03T05:31:00.000+08:00')), true, '05:31:00.000 算');
  assert.equal(inEarlyWindow(at('2026-11-03T05:31:59.999+08:00')), true, '05:31:59.999 算');
  assert.equal(inEarlyWindow(at('2026-11-03T05:32:00.000+08:00')), false, '05:32:00.000 不算');
});

test('早起窗口：不受进程时区影响', () => {
  const prev = process.env.TZ;
  const utcWin = (() => { process.env.TZ = 'UTC'; return inEarlyWindow(at('2026-11-03T05:31:30+08:00')); })();
  const nyWin = (() => { process.env.TZ = 'America/New_York'; return inEarlyWindow(at('2026-11-03T05:31:30+08:00')); })();
  process.env.TZ = prev;
  assert.equal(utcWin, true);
  assert.equal(nyWin, true);
});

test('业务日期按北京时间切日', () => {
  assert.equal(bjDateStr(at('2026-11-03T23:30:00+08:00')), '2026-11-03');
  assert.equal(bjDateStr(at('2026-11-03T16:30:00Z')), '2026-11-04');
  assert.equal(bjDateStr(at('2026-11-01T16:00:00Z')), '2026-11-02');
});

test('一天内的毫秒偏移正确', () => {
  assert.equal(msOfBjDay(at('2026-11-03T05:31:00.000+08:00')), 19860000);
  assert.equal(msOfBjDay(at('2026-11-03T00:00:00.000+08:00')), 0);
});

test('周起点为周一', () => {
  assert.equal(weekStartDate('2026-11-03'), '2026-11-02');
  assert.equal(weekStartDate('2026-11-02'), '2026-11-02');
  assert.equal(weekStartDate('2026-11-08'), '2026-11-02');
  assert.equal(addDays('2026-11-02', 6), '2026-11-08');
});
