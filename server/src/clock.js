/**
 * 业务时间：一律按北京时间（UTC+8）计算日期，不依赖进程 TZ。
 * 早起窗口为半开区间 [05:31:00.000, 05:32:00.000)，涵盖最后一秒的小数部分。
 */

const BJ_OFFSET_MS = 8 * 60 * 60 * 1000;
const pad = (n) => String(n).padStart(2, '0');

export const EARLY_START_MS = ((5 * 60 + 31) * 60) * 1000;
export const EARLY_WINDOW_MS = 60 * 1000;

export function bjParts(date) {
  const t = new Date(date.getTime() + BJ_OFFSET_MS);
  return {
    y: t.getUTCFullYear(),
    m: t.getUTCMonth() + 1,
    d: t.getUTCDate(),
    hh: t.getUTCHours(),
    mm: t.getUTCMinutes(),
    ss: t.getUTCSeconds(),
    ms: t.getUTCMilliseconds(),
  };
}

export function bjDateStr(date) {
  const p = bjParts(date);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

export function bjTimeStr(date) {
  const p = bjParts(date);
  return `${pad(p.hh)}:${pad(p.mm)}:${pad(p.ss)}.${String(p.ms).padStart(3, '0')}`;
}

/** 给人看的北京时间：2026-11-03 13:40:00（对外输出一律用它，不吐 UTC） */
export function bjDateTimeStr(date) {
  return `${bjDateStr(date)} ${bjTimeStr(date).slice(0, 8)}`;
}

export function msOfBjDay(date) {
  const p = bjParts(date);
  return ((p.hh * 3600 + p.mm * 60 + p.ss) * 1000) + p.ms;
}

/** 是否落在北京时间 05:31:00.000 – 05:31:59.999 */
export function inEarlyWindow(date) {
  const ms = msOfBjDay(date);
  return ms >= EARLY_START_MS && ms < EARLY_START_MS + EARLY_WINDOW_MS;
}

/**
 * 早起窗口在某一业务日对应的绝对时间范围，用于生成展示文案或调试。
 * 输入为 "YYYY-MM-DD"（北京时间日期）。
 */
export function earlyWindowRange(bizDate) {
  const start = new Date(`${bizDate}T05:31:00.000+08:00`);
  const end = new Date(start.getTime() + EARLY_WINDOW_MS);
  return { start, end };
}

/** 周一为一周起始，返回该周周一的北京日期，用于周榜分桶 */
export function weekStartDate(bizDate) {
  const [y, m, d] = bizDate.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  const dow = t.getUTCDay() === 0 ? 7 : t.getUTCDay();
  return addDays(bizDate, -(dow - 1));
}

/** 纯日期加减，不做时区换算（输入输出都是 YYYY-MM-DD） */
export function addDays(bizDate, n) {
  const [y, m, d] = bizDate.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() + n);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function nowIso() {
  return new Date().toISOString();
}

