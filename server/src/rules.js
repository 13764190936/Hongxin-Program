/**
 * 业务规则集中处。所有判定都是纯函数，方便单测与将来改规则。
 *
 * 已由负责人确认（2026-11-03）：
 *   Q2  不做综合分 —— 排行榜只按单项目排序
 *   Q3  早起以「客户端点击时刻」为判定基准
 *   Q7  只做小组 / 企业内排行，不做跨企业
 *
 * 本文件的默认值与 docs/ACTION-METRICS.md 一一对应；改规则先改文档再改这里。
 */

import { inEarlyWindow, bjDateStr } from './clock.js';

export class ValidationError extends Error {
  constructor(code, message, status = 422) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/** 客户端声称时刻与服务端接收时刻的容差。超过即进待核，不直接拒绝。 */
export const SKEW_TOLERANCE_MS = 180 * 1000;

/** 阅读最短有效时长（秒）。低于该值不计入排行，仅保留记录。 */
export const READ_MIN_SECONDS = 60;

export const KINDS = ['early', 'run', 'read', 'visit'];

export function parseClaimedAt(input) {
  if (typeof input !== 'string' || input.length < 10) {
    throw new ValidationError('claimedAt_invalid', 'claimedAt 必须是带时区的 ISO 时间字符串');
  }
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(input)) {
    throw new ValidationError('claimedAt_no_offset', 'claimedAt 必须带时区（Z 或 ±hh:mm），不能只给本地时间');
  }
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) {
    throw new ValidationError('claimedAt_invalid', 'claimedAt 无法解析为时间');
  }
  return d;
}

function num(v, field, { min = 0, integer = false } = {}) {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new ValidationError(`${field}_invalid`, `${field} 必须是数字`);
  if (n < min) throw new ValidationError(`${field}_range`, `${field} 不能小于 ${min}`);
  if (integer && !Number.isInteger(n)) throw new ValidationError(`${field}_not_integer`, `${field} 必须是整数`);
  return n;
}

/**
 * 评估一条行动提交。
 * @returns {{status:'valid'|'pending_review', reviewReason:string|null, metrics:object, bizDate:string}}
 */
export function evaluate(kind, { claimedAt, receivedAt, payload = {} }) {
  const claimed = parseClaimedAt(claimedAt);
  const received = receivedAt instanceof Date ? receivedAt : new Date(receivedAt);
  const delay = received.getTime() - claimed.getTime();

  if (!KINDS.includes(kind)) {
    throw new ValidationError('kind_unknown', `未知的行动类型：${kind}`);
  }

  const bizDate = bjDateStr(claimed);
  const flags = [];

  // Q3 决策：以客户端点击时刻判定窗口。偏差过大不拒绝，转入待核。
  if (Math.abs(delay) > SKEW_TOLERANCE_MS) {
    flags.push(delay > 0 ? 'client_clock_behind' : 'client_clock_ahead');
  }

  let metrics = {};

  if (kind === 'early') {
    if (!inEarlyWindow(claimed)) {
      throw new ValidationError(
        'early_out_of_window',
        '不在 05:31:00–05:31:59 窗口内，未记录',
      );
    }
    metrics = { counted: true };
  }

  if (kind === 'run') {
    const distance = num(payload.distanceKm, 'distanceKm', { min: 0.01 });
    const minutes = num(payload.minutes, 'minutes', { min: 1 });
    const steps = num(payload.steps, 'steps', { min: 1, integer: true });
    if (!payload.imageRef || typeof payload.imageRef !== 'string') {
      throw new ValidationError('image_required', '晨跑需要一张运动截图引用（imageRef）');
    }
    metrics = { distanceKm: distance, minutes, steps };
    if (payload.ocrMock === true) flags.push('ocr_is_mock');
  }

  if (kind === 'read') {
    const seconds = num(payload.readSeconds, 'readSeconds', { min: 0, integer: true });
    if (seconds < READ_MIN_SECONDS) {
      throw new ValidationError('read_too_short', `阅读时长不足 ${READ_MIN_SECONDS} 秒，未记录`);
    }
    metrics = { readSeconds: seconds, completed: payload.completed === true };
    if (payload.completed !== true) flags.push('task_not_completed');
  }

  if (kind === 'visit') {
    // 次数上限未定，当前默认每日 1 次（见 ACTION-METRICS.md）
    metrics = { selfDeclared: true };
  }

  // review_reason 只放「需要人工看一眼」的原因；
  // task_not_completed 属业务结果（记了但不算完成），由 metrics.completed 表达，不进待核。
  const reviewFlags = flags.filter((f) => f !== 'task_not_completed');
  return {
    status: reviewFlags.length ? 'pending_review' : 'valid',
    reviewReason: reviewFlags.length ? reviewFlags.join(',') : null,
    metrics,
    bizDate,
    receivedDelayMs: delay,
  };
}
