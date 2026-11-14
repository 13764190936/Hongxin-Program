/**
 * 数据访问与聚合。所有查询都显式带 enterprise_id 约束（跨企业隔离在服务端）。
 */

import { randomUUID } from 'node:crypto';
import { getDb } from './db.js';
import { bjDateStr, weekStartDate, addDays, bjDateTimeStr } from './clock.js';
import { evaluate, ValidationError } from './rules.js';

const uuid = () => randomUUID();
const nowIso = () => new Date().toISOString();

export function findUserById(id) {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id) || null;
}

export function listUsersOfEnterprise(enterpriseId) {
  return getDb().prepare('SELECT * FROM users WHERE enterprise_id = ? ORDER BY name').all(enterpriseId);
}

export function currentTeamOf(userId) {
  return getDb().prepare(
    `SELECT t.* FROM teams t
     JOIN team_members m ON m.team_id = t.id
     WHERE m.user_id = ? AND m.left_at IS NULL
     LIMIT 1`,
  ).get(userId) || null;
}

export function listTasksOfCourse(courseId) {
  return getDb().prepare('SELECT * FROM tasks WHERE course_id = ?').all(courseId);
}

export function listRecordsOfDay(userId, bizDate) {
  return getDb().prepare(
    'SELECT * FROM action_records WHERE user_id = ? AND biz_date = ? ORDER BY created_at',
  ).all(userId, bizDate);
}

export function todayFor(user, at = new Date()) {
  const bizDate = bjDateStr(at);
  const tasks = user.course_id ? listTasksOfCourse(user.course_id) : [];
  const records = listRecordsOfDay(user.id, bizDate);
  const byKind = {};
  for (const r of records) {
    if (!byKind[r.kind]) byKind[r.kind] = [];
    byKind[r.kind].push(serializeRecord(r));
  }
  return {
    bizDate,
    timezone: 'Asia/Shanghai',
    tasks: tasks.map((t) => ({
      kind: t.kind,
      title: t.title,
      done: (byKind[t.kind] || []).length > 0,
      records: byKind[t.kind] || [],
      rule: JSON.parse(t.rule_json || '{}'),
    })),
  };
}

export function serializeRecord(r) {
  return {
    id: r.id,
    kind: r.kind,
    bizDate: r.biz_date,
    teamId: r.team_id,
    status: r.status,
    reviewReason: r.review_reason,
    clientClaimedAt: r.client_claimed_at,
    serverReceivedAt: r.server_received_at,
    clientClaimedBj: bjDateTimeStr(new Date(r.client_claimed_at)),
    serverReceivedBj: bjDateTimeStr(new Date(r.server_received_at)),
    receivedDelayMs: r.received_delay_ms,
    metrics: JSON.parse(r.metrics_json || '{}'),
    payload: JSON.parse(r.payload_json || '{}'),
  };
}

export function submitAction(user, input) {
  const { kind, idempotencyKey, claimedAt, payload } = input || {};
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    throw new ValidationError('idempotency_key_required', '必须提供 idempotencyKey，用于避免重复提交');
  }
  if (!user.course_id) {
    throw new ValidationError('no_course', '当前账号未关联课程，无法提交行动', 409);
  }

  const db = getDb();
  const existed = db.prepare(
    'SELECT * FROM action_records WHERE user_id = ? AND idempotency_key = ?',
  ).get(user.id, idempotencyKey);
  if (existed) return { record: serializeRecord(existed), idempotent: true };

  const receivedAt = new Date();
  const verdict = evaluate(kind, { claimedAt, receivedAt, payload });
  const team = currentTeamOf(user.id);

  if (kind === 'visit') {
    const dup = db.prepare(
      `SELECT id FROM action_records WHERE user_id = ? AND biz_date = ? AND kind = 'visit'`,
    ).get(user.id, verdict.bizDate);
    if (dup) {
      throw new ValidationError('visit_daily_limit', '今日已记录过一次拜访（每日 1 次为当前默认，待确认）', 409);
    }
  }

  const task = db.prepare('SELECT * FROM tasks WHERE course_id = ? AND kind = ?').get(user.course_id, kind);
  const id = uuid();
  db.prepare(
    `INSERT INTO action_records
      (id, enterprise_id, user_id, course_id, task_id, kind, biz_date, team_id,
       client_claimed_at, server_received_at, received_delay_ms, status, review_reason,
       metrics_json, payload_json, idempotency_key, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).run(
    id, user.enterprise_id, user.id, user.course_id, task ? task.id : 'unknown', kind,
    verdict.bizDate, team ? team.id : null,
    new Date(claimedAt).toISOString(), receivedAt.toISOString(), verdict.receivedDelayMs,
    verdict.status, verdict.reviewReason,
    JSON.stringify(verdict.metrics), JSON.stringify(payload || {}),
    idempotencyKey, nowIso(),
  );

  const row = db.prepare('SELECT * FROM action_records WHERE id = ?').get(id);
  return { record: serializeRecord(row), idempotent: false };
}

export function listMyRecords(user, { from, to, limit = 50 } = {}) {
  const db = getDb();
  const args = [user.id];
  let sql = 'SELECT * FROM action_records WHERE user_id = ?';
  if (from) { sql += ' AND biz_date >= ?'; args.push(from); }
  if (to) { sql += ' AND biz_date <= ?'; args.push(to); }
  sql += ' ORDER BY created_at DESC LIMIT ?';
  args.push(Math.min(Number(limit) || 50, 200));
  return db.prepare(sql).all(...args).map(serializeRecord);
}

export function listEnterpriseRecords(admin, { from, to, kind, status, teamId, limit = 200 } = {}) {
  const db = getDb();
  const args = [admin.enterprise_id];
  let sql = `SELECT r.*, u.name AS user_name, t.name AS team_name
             FROM action_records r
             JOIN users u ON u.id = r.user_id
             LEFT JOIN teams t ON t.id = r.team_id
             WHERE r.enterprise_id = ?`;
  if (from) { sql += ' AND r.biz_date >= ?'; args.push(from); }
  if (to) { sql += ' AND r.biz_date <= ?'; args.push(to); }
  if (kind) { sql += ' AND r.kind = ?'; args.push(kind); }
  if (status) { sql += ' AND r.status = ?'; args.push(status); }
  if (teamId) { sql += ' AND r.team_id = ?'; args.push(teamId); }
  sql += ' ORDER BY r.biz_date DESC, r.created_at DESC LIMIT ?';
  args.push(Math.min(Number(limit) || 200, 1000));

  return db.prepare(sql).all(...args).map((r) => ({
    ...serializeRecord(r),
    userName: r.user_name,
    teamName: r.team_name || '',
  }));
}

export function listTeams(user) {
  return getDb().prepare(
    'SELECT * FROM teams WHERE enterprise_id = ? AND course_id = ? ORDER BY created_at',
  ).all(user.enterprise_id, user.course_id).map((t) => ({
    id: t.id, name: t.name, slogan: t.slogan, city: t.city,
    captainId: t.captain_id, inviteCode: t.invite_code,
    memberCount: getDb().prepare(
      'SELECT COUNT(*) AS n FROM team_members WHERE team_id = ? AND left_at IS NULL',
    ).get(t.id).n,
  }));
}

export function createTeam(user, { name, slogan = '', city = '' } = {}) {
  const db = getDb();
  const trimmed = String(name || '').trim();
  if (!trimmed) throw new ValidationError('team_name_required', '团队名称不能为空');
  if (trimmed.length > 20) throw new ValidationError('team_name_too_long', '团队名称不超过 20 字');
  if (String(slogan).length > 20) throw new ValidationError('slogan_too_long', '口号不超过 20 字');
  if (!user.course_id) throw new ValidationError('no_course', '未关联课程，无法创建团队', 409);

  if (currentTeamOf(user.id)) {
    throw new ValidationError('already_in_team', '当前已在一个团队中；多团队规则未定，本次不创建', 409);
  }

  const id = uuid();
  const code = 'HX' + Math.random().toString(36).slice(2, 5).toUpperCase();
  try {
    db.prepare(
      `INSERT INTO teams (id, enterprise_id, course_id, name, slogan, city, captain_id, invite_code, created_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
    ).run(id, user.enterprise_id, user.course_id, trimmed, String(slogan), String(city), user.id, code, nowIso());
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      throw new ValidationError('team_name_taken', '同一课程下已有同名团队', 409);
    }
    throw e;
  }
  db.prepare('INSERT INTO team_members (team_id, user_id, joined_at) VALUES (?,?,?)')
    .run(id, user.id, nowIso());
  return listTeams(user).find((t) => t.id === id);
}

export function joinTeam(user, teamId) {
  const db = getDb();
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
  if (!team) throw new ValidationError('team_not_found', '团队不存在', 404);
  if (team.enterprise_id !== user.enterprise_id) {
    throw new ValidationError('cross_enterprise', '不能加入其他企业的团队', 403);
  }
  if (team.course_id !== user.course_id) {
    throw new ValidationError('course_mismatch', '团队不属于你当前参与的课程', 409);
  }
  const mine = currentTeamOf(user.id);
  if (mine && mine.id === teamId) {
    return { team: listTeams(user).find((t) => t.id === teamId), alreadyMember: true };
  }
  if (mine) {
    throw new ValidationError('already_in_team', '已在其他团队；转队规则未定，本次不加入', 409);
  }
  db.prepare('INSERT INTO team_members (team_id, user_id, joined_at) VALUES (?,?,?)')
    .run(teamId, user.id, nowIso());
  return { team: listTeams(user).find((t) => t.id === teamId), alreadyMember: false };
}

/* ---------------- 排行（Q2：单项目；Q7：仅小组/企业内） ---------------- */

const METRICS = {
  early_count: { kind: 'early', field: null, label: '早起次数', unit: '次' },
  run_km: { kind: 'run', field: 'distanceKm', label: '晨跑里程', unit: '公里' },
  read_minutes: { kind: 'read', field: 'readSeconds', label: '阅读时长', unit: '分钟' },
};

export function rankings(user, { scope = 'team', metric = 'early_count', period = 'day', date } = {}) {
  const db = getDb();
  const m = METRICS[metric];
  if (!m) throw new ValidationError('metric_unknown', `只支持 ${Object.keys(METRICS).join(' / ')}；综合分已按决策取消`);
  if (!['team', 'enterprise'].includes(scope)) {
    throw new ValidationError('scope_unsupported', '当前只支持 team / enterprise；跨企业排行未启用');
  }

  const bizDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : bjDateStr(new Date());
  const from = period === 'week' ? weekStartDate(bizDate) : bizDate;
  const to = period === 'week' ? addDays(from, 6) : bizDate;

  const rows = db.prepare(
    `SELECT * FROM action_records
     WHERE enterprise_id = ? AND kind = ? AND status = 'valid'
       AND biz_date BETWEEN ? AND ?`,
  ).all(user.enterprise_id, m.kind, from, to);

  const sumBy = (fn) => {
    const acc = new Map();
    for (const r of rows) {
      const key = fn(r);
      if (!key) continue;
      const metrics = JSON.parse(r.metrics_json || '{}');
      const val = m.field ? Number(metrics[m.field] || 0) : 1;
      acc.set(key, (acc.get(key) || 0) + val);
    }
    return acc;
  };

  if (scope === 'team') {
    const team = currentTeamOf(user.id);
    if (!team) {
      return { scope, metric, metricLabel: m.label, unit: m.unit, period, from, to, rows: [], note: '尚未加入团队，暂无小组排名' };
    }
    const members = db.prepare(
      'SELECT u.id, u.name FROM users u JOIN team_members tm ON tm.user_id = u.id WHERE tm.team_id = ? AND tm.left_at IS NULL',
    ).all(team.id);
    const acc = sumBy((r) => (r.team_id === team.id ? r.user_id : null));
    const out = members.map((u) => ({
      id: u.id, name: u.name,
      value: normalize(acc.get(u.id) || 0, m),
      isMe: u.id === user.id,
    })).sort((a, b) => b.value - a.value);
    return { scope, metric, metricLabel: m.label, unit: m.unit, period, from, to, team: team.name, rows: withRank(out) };
  }

  const teams = db.prepare('SELECT id, name FROM teams WHERE enterprise_id = ? AND course_id = ?')
    .all(user.enterprise_id, user.course_id);
  const acc = sumBy((r) => r.team_id || null);
  const out = teams.map((t) => ({
    id: t.id, name: t.name, value: normalize(acc.get(t.id) || 0, m),
  })).sort((a, b) => b.value - a.value);
  return { scope, metric, metricLabel: m.label, unit: m.unit, period, from, to, rows: withRank(out) };
}

function normalize(v, m) {
  return m.field === 'readSeconds' ? Math.round(v / 60) : Math.round(v * 100) / 100;
}

function withRank(list) {
  let lastVal = null;
  let lastRank = 0;
  return list.map((row, i) => {
    const rank = row.value === lastVal ? lastRank : i + 1;
    lastVal = row.value;
    lastRank = rank;
    return { ...row, rank };
  });
}

/* ---------------- 导出（企业内，记录操作人） ---------------- */

export function exportCsv(admin, filters) {
  if (admin.role !== 'admin') throw new ValidationError('forbidden', '只有管理员可以导出', 403);
  const rows = listEnterpriseRecords(admin, { ...filters, limit: 1000 });
  const header = ['日期', '姓名', '团队', '项目', '状态', '客户端时刻(北京)', '服务端接收(北京)', '指标'];
  const body = rows.map((r) => [
    r.bizDate, r.userName, r.teamName, r.kind, r.status,
    r.clientClaimedBj, r.serverReceivedBj, JSON.stringify(r.metrics),
  ]);
  getDb().prepare(
    'INSERT INTO export_logs (id, enterprise_id, actor_id, filters_json, row_count, created_at) VALUES (?,?,?,?,?,?)',
  ).run(uuid(), admin.enterprise_id, admin.id, JSON.stringify(filters || {}), rows.length, nowIso());

  const csv = [header, ...body]
    .map((cols) => cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  return { csv: '\uFEFF' + csv, rowCount: rows.length };
}

