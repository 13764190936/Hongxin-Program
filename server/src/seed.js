/**
 * 虚构测试数据。两家企业用于验证跨企业隔离（A 企业管理员看不到 B 企业）。
 * 所有姓名、团队、记录均为虚构，不含任何真实用户信息。
 *
 * 用法：node src/seed.js [--reset]
 */

import { randomUUID } from 'node:crypto';
import { getDb, resetDb, dbPath } from './db.js';
import { bjDateStr, addDays, weekStartDate } from './clock.js';

const uuid = () => randomUUID();
const iso = (d) => d.toISOString();

const db = getDb();
if (process.argv.includes('--reset')) resetDb();

const now = new Date();
const today = bjDateStr(now);
const yesterday = addDays(today, -1);
const weekStart = weekStartDate(today);

const ENT = [
  { id: 'ent-alpha', name: '星禾企业' },
  { id: 'ent-beta', name: '云栖科技' },
];

const COURSES = [
  { id: 'c-alpha', ent: 'ent-alpha', title: '卓越成长 · 21天行动营', totalDays: 21, start: addDays(today, -7) },
  { id: 'c-beta', ent: 'ent-beta', title: '管理者行动力训练', totalDays: 14, start: addDays(today, -3) },
];

const USERS = [
  { id: 'u_alpha_admin', ent: 'ent-alpha', name: '张敏', role: 'admin', course: 'c-alpha' },
  { id: 'u_zhou', ent: 'ent-alpha', name: '周予安', role: 'employee', course: 'c-alpha' },
  { id: 'u_chen', ent: 'ent-alpha', name: '陈以宁', role: 'employee', course: 'c-alpha' },
  { id: 'u_gu', ent: 'ent-alpha', name: '顾行舟', role: 'employee', course: 'c-alpha' },
  { id: 'u_he', ent: 'ent-alpha', name: '何一苇', role: 'employee', course: 'c-alpha' },
  { id: 'u_wen', ent: 'ent-alpha', name: '温听', role: 'employee', course: 'c-alpha' },
  { id: 'u_lin', ent: 'ent-alpha', name: '林清和', role: 'employee', course: 'c-alpha' },
  { id: 'u_beta_admin', ent: 'ent-beta', name: '沈云', role: 'admin', course: 'c-beta' },
  { id: 'u_beta_1', ent: 'ent-beta', name: '罗盘', role: 'employee', course: 'c-beta' },
  { id: 'u_beta_2', ent: 'ent-beta', name: '姜屿', role: 'employee', course: 'c-beta' },
];

const TEAMS = [
  { id: 't_up', ent: 'ent-alpha', course: 'c-alpha', name: '向上同行', slogan: '一起早起，一起向前', city: '杭州', captain: 'u_zhou', code: 'HX531' },
  { id: 't_zhi', ent: 'ent-alpha', course: 'c-alpha', name: '知行小组', slogan: '把读过的道理，变成做过的事', city: '上海', captain: 'u_he', code: 'HX218' },
  { id: 't_chen', ent: 'ent-alpha', course: 'c-alpha', name: '晨光小组', slogan: '从清晨开始', city: '苏州', captain: 'u_gu', code: 'HX608' },
  { id: 't_beta', ent: 'ent-beta', course: 'c-beta', name: '云栖一组', slogan: '同一片云下', city: '杭州', captain: 'u_beta_1', code: 'YQ001' },
];

const MEMBERS = [
  ['t_up', 'u_zhou'], ['t_up', 'u_wen'], ['t_up', 'u_lin'],
  ['t_zhi', 'u_chen'], ['t_zhi', 'u_he'],
  ['t_chen', 'u_gu'],
  ['t_beta', 'u_beta_1'], ['t_beta', 'u_beta_2'],
];

const TASKS = [
  { kind: 'early', title: '5:31 早起' },
  { kind: 'run', title: '晨跑' },
  { kind: 'read', title: '指定阅读' },
  { kind: 'visit', title: '拜访' },
];

const t0 = Date.now();
db.exec('BEGIN');
try {
  for (const e of ENT) {
    db.prepare('INSERT OR REPLACE INTO enterprises (id,name,created_at) VALUES (?,?,?)').run(e.id, e.name, iso(new Date(t0)));
  }
  for (const c of COURSES) {
    db.prepare('INSERT OR REPLACE INTO courses (id,enterprise_id,title,total_days,start_date) VALUES (?,?,?,?,?)')
      .run(c.id, c.ent, c.title, c.totalDays, c.start);
    for (const t of TASKS) {
      const rule = t.kind === 'early'
        ? { window: '05:31:00-05:31:59', timezone: 'Asia/Shanghai', basis: 'client_claimed_at' }
        : t.kind === 'read' ? { minSeconds: 60, metric: 'read_minutes' }
        : t.kind === 'visit' ? { dailyLimit: 1, note: '当前默认，待确认' } : { needImage: true };
      db.prepare('INSERT OR REPLACE INTO tasks (id,course_id,kind,title,rule_json) VALUES (?,?,?,?,?)')
        .run(`${c.id}:${t.kind}`, c.id, t.kind, t.title, JSON.stringify(rule));
    }
  }
  for (const u of USERS) {
    db.prepare('INSERT OR REPLACE INTO users (id,enterprise_id,name,role,course_id,created_at) VALUES (?,?,?,?,?,?)')
      .run(u.id, u.ent, u.name, u.role, u.course, iso(new Date(t0)));
  }
  for (const t of TEAMS) {
    db.prepare('INSERT OR REPLACE INTO teams (id,enterprise_id,course_id,name,slogan,city,captain_id,invite_code,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(t.id, t.ent, t.course, t.name, t.slogan, t.city, t.captain, t.code, iso(new Date(t0)));
  }
  for (const [team, user] of MEMBERS) {
    db.prepare('INSERT OR REPLACE INTO team_members (team_id,user_id,joined_at,left_at) VALUES (?,?,?,NULL)')
      .run(team, user, iso(new Date(t0)));
  }

  // 历史记录：直接写入，不走提交校验（种子数据需要固定的“已存在”状态）
  const seedRecords = [
    { user: 'u_zhou', team: 't_up', kind: 'early', date: today, at: '05:31:12' },
    { user: 'u_zhou', team: 't_up', kind: 'run', date: today, at: '06:40:00', metrics: { distanceKm: 3.2, minutes: 26, steps: 4280 } },
    { user: 'u_zhou', team: 't_up', kind: 'read', date: today, at: '12:10:00', metrics: { readSeconds: 1500, completed: true } },
    { user: 'u_zhou', team: 't_up', kind: 'visit', date: today, at: '15:20:00', metrics: { selfDeclared: true } },
    { user: 'u_wen', team: 't_up', kind: 'early', date: today, at: '05:31:40' },
    { user: 'u_wen', team: 't_up', kind: 'read', date: today, at: '09:00:00', metrics: { readSeconds: 2400, completed: true } },
    { user: 'u_chen', team: 't_zhi', kind: 'early', date: today, at: '05:31:05' },
    { user: 'u_chen', team: 't_zhi', kind: 'run', date: today, at: '07:10:00', metrics: { distanceKm: 5.1, minutes: 32, steps: 6900 } },
    { user: 'u_he', team: 't_zhi', kind: 'early', date: today, at: '05:31:55' },
    { user: 'u_gu', team: 't_chen', kind: 'early', date: today, at: '05:31:20' },
    { user: 'u_gu', team: 't_chen', kind: 'run', date: today, at: '06:05:00', metrics: { distanceKm: 4.0, minutes: 25, steps: 5200 } },
    { user: 'u_gu', team: 't_chen', kind: 'read', date: today, at: '21:00:00', metrics: { readSeconds: 1800, completed: true } },
    { user: 'u_zhou', team: 't_up', kind: 'early', date: yesterday, at: '05:31:30' },
    { user: 'u_wen', team: 't_up', kind: 'early', date: yesterday, at: '05:31:10' },
    { user: 'u_gu', team: 't_chen', kind: 'early', date: yesterday, at: '05:31:44' },
    { user: 'u_beta_1', team: 't_beta', kind: 'early', date: today, at: '05:31:02' },
    // 演示主账号：早起与晨跑已完成，预留给「阅读」「拜访」现场操作
    { user: 'u_lin', team: 't_up', kind: 'early', date: today, at: '05:31:18' },
    { user: 'u_lin', team: 't_up', kind: 'run', date: today, at: '06:22:00', metrics: { distanceKm: 3.6, minutes: 24, steps: 4800 } },
  ];

  for (const r of seedRecords) {
    const user = USERS.find((u) => u.id === r.user);
    const claimed = new Date(`${r.date}T${r.at}.000+08:00`);
    const received = new Date(claimed.getTime() + 2000);
    db.prepare(
      `INSERT INTO action_records
        (id, enterprise_id, user_id, course_id, task_id, kind, biz_date, team_id,
         client_claimed_at, server_received_at, received_delay_ms, status, review_reason,
         metrics_json, payload_json, idempotency_key, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).run(
      uuid(), user.ent, user.id, user.course, `${user.course}:${r.kind}`, r.kind, r.date, r.team,
      claimed.toISOString(), received.toISOString(), 2000, 'valid', null,
      JSON.stringify(r.metrics || {}), '{}',
      `seed-${user.id}-${r.kind}-${r.date}`, received.toISOString(),
    );
  }

  db.exec('COMMIT');
} catch (e) {
  db.exec('ROLLBACK');
  throw e;
}

const count = db.prepare('SELECT COUNT(*) AS n FROM action_records').get().n;
console.log('');
console.log(`  种子数据已写入：${dbPath()}`);
console.log(`  企业 ${ENT.length} 家 · 用户 ${USERS.length} 人 · 团队 ${TEAMS.length} 支 · 记录 ${count} 条`);
console.log(`  今天（北京）= ${today}；本周一 = ${weekStart}`);
console.log('');
console.log('  演示账号（测试适配层，用 X-Test-User 头传 id）：');
for (const u of USERS) console.log(`    ${u.id.padEnd(14)} ${u.name}  ${u.role}  ${u.ent}`);
console.log('');
