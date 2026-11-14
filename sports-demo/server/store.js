// 仓储接口（当前内存实现）。后续接数据库时保持同样的方法签名即可替换。
// 注意：这里不保存原始图片，只保存 SHA256、大小、类型和模拟分析结果。
export function createMemoryRepository() {
  let state = emptyState();

  function emptyState() {
    return {
      steps: new Map(), // `${day}:${userId}` -> 每日绝对步数快照
      runs: [],
      idempotency: new Map(), // `${userId}:${route}:${key}` -> {requestHash,status,body}
    };
  }

  return {
    reset() {
      state = emptyState();
    },

    // ---- 步数快照（每日绝对快照，不是增量）----
    putStep(record) {
      state.steps.set(`${record.day}:${record.userId}`, record);
      return record;
    },
    getStep(day, userId) {
      return state.steps.get(`${day}:${userId}`) || null;
    },
    listStepsByDay(day) {
      return [...state.steps.values()].filter((r) => r.day === day);
    },
    listStepsByUser(userId) {
      return [...state.steps.values()].filter((r) => r.userId === userId);
    },

    // ---- 跑步记录 ----
    insertRun(run) {
      state.runs.push(run);
      return run;
    },
    // 单线程内的“检查 + 插入”原子操作：从调用到写入之间没有 await，
    // 供 runService 在分析器返回后做最终唯一性校验。接数据库时应改为唯一索引 + 事务。
    tryInsertRun(run) {
      const dayConflict = state.runs.find((r) => r.userId === run.userId && r.day === run.day);
      if (dayConflict) return { ok: false, reason: 'DAY', existing: dayConflict };
      const shaConflict = state.runs.find((r) => r.sha256 === run.sha256);
      if (shaConflict) return { ok: false, reason: 'SHA', existing: shaConflict };
      state.runs.push(run);
      return { ok: true, run };
    },
    getRunByUserDay(userId, day) {
      return state.runs.find((r) => r.userId === userId && r.day === day) || null;
    },
    findRunBySha(sha256) {
      return state.runs.find((r) => r.sha256 === sha256) || null;
    },
    listRunsByDay(day) {
      return state.runs.filter((r) => r.day === day);
    },
    listRuns() {
      return [...state.runs];
    },

    // ---- 幂等键 ----
    getIdempotency(key) {
      return state.idempotency.get(key) || null;
    },
    putIdempotency(key, value) {
      state.idempotency.set(key, value);
      return value;
    },
  };
}
