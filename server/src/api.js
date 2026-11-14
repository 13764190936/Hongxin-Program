/**
 * HTTP 接口层。只做参数解析、鉴权适配与错误映射，业务判断都在 rules/repo 里。
 *
 * 鉴权说明：当前为「测试适配层」，用请求头 X-Test-User 直接传用户 id。
 * 这不是正式鉴权，接微信登录后要换成服务端签发的会话；但在本层之外，
 * 所有查询都已强制带 enterprise_id，跨企业读写在 repo 层就挡住了。
 */

import * as repo from './repo.js';
import { ValidationError } from './rules.js';

const MAX_BODY = 1024 * 256;

function json(res, status, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type, x-test-user',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new ValidationError('body_too_large', '请求体过大', 413)); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { reject(new ValidationError('body_not_json', '请求体不是合法 JSON', 400)); }
    });
    req.on('error', reject);
  });
}

function authenticate(req) {
  const id = req.headers['x-test-user'];
  if (!id) {
    throw new ValidationError('unauthenticated', '缺少 X-Test-User；当前为测试适配层，正式版应换成服务端会话', 401);
  }
  const user = repo.findUserById(String(id));
  if (!user) throw new ValidationError('unknown_user', `测试用户不存在：${id}`, 401);
  return user;
}

export async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type, x-test-user',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
    });
    return res.end();
  }

  try {
    if (path === '/api/health') {
      return json(res, 200, { ok: true, time: new Date().toISOString(), tz: 'Asia/Shanghai' });
    }

    if (path === '/api/meta') {
      const users = repo.listUsersOfEnterprise('ent-alpha').concat(repo.listUsersOfEnterprise('ent-beta'));
      return json(res, 200, {
        users: users.map((u) => ({ id: u.id, name: u.name, role: u.role, enterpriseId: u.enterprise_id })),
        metrics: ['early_count', 'run_km', 'read_minutes'],
        scopes: ['team', 'enterprise'],
        note: '综合分（综合行动）已按 Q2 决策取消；跨企业排行按 Q7 未启用。',
      });
    }

    const user = authenticate(req);

    if (path === '/api/me' && req.method === 'GET') {
      const team = repo.currentTeamOf(user.id);
      return json(res, 200, {
        id: user.id, name: user.name, role: user.role,
        enterpriseId: user.enterprise_id, courseId: user.course_id,
        team: team ? { id: team.id, name: team.name } : null,
      });
    }

    if (path === '/api/today' && req.method === 'GET') {
      return json(res, 200, repo.todayFor(user));
    }

    if (path === '/api/actions' && req.method === 'POST') {
      const body = await readBody(req);
      const result = repo.submitAction(user, body);
      return json(res, result.idempotent ? 200 : 201, result);
    }

    if (path === '/api/records' && req.method === 'GET') {
      return json(res, 200, {
        rows: repo.listMyRecords(user, {
          from: url.searchParams.get('from') || undefined,
          to: url.searchParams.get('to') || undefined,
          limit: url.searchParams.get('limit') || undefined,
        }),
      });
    }

    if (path === '/api/teams' && req.method === 'GET') {
      return json(res, 200, { rows: repo.listTeams(user) });
    }

    if (path === '/api/teams' && req.method === 'POST') {
      const body = await readBody(req);
      return json(res, 201, { team: repo.createTeam(user, body) });
    }

    const joinMatch = path.match(/^\/api\/teams\/([^/]+)\/join$/);
    if (joinMatch && req.method === 'POST') {
      return json(res, 200, repo.joinTeam(user, joinMatch[1]));
    }

    if (path === '/api/rankings' && req.method === 'GET') {
      return json(res, 200, repo.rankings(user, {
        scope: url.searchParams.get('scope') || 'team',
        metric: url.searchParams.get('metric') || 'early_count',
        period: url.searchParams.get('period') || 'day',
        date: url.searchParams.get('date') || undefined,
      }));
    }

    if (path === '/api/admin/records' && req.method === 'GET') {
      if (user.role !== 'admin') throw new ValidationError('forbidden', '只有管理员可以查看全企业记录', 403);
      return json(res, 200, {
        rows: repo.listEnterpriseRecords(user, {
          from: url.searchParams.get('from') || undefined,
          to: url.searchParams.get('to') || undefined,
          kind: url.searchParams.get('kind') || undefined,
          status: url.searchParams.get('status') || undefined,
          teamId: url.searchParams.get('teamId') || undefined,
        }),
      });
    }

    if (path === '/api/admin/export.csv' && req.method === 'GET') {
      const { csv, rowCount } = repo.exportCsv(user, {
        from: url.searchParams.get('from') || undefined,
        to: url.searchParams.get('to') || undefined,
      });
      res.writeHead(200, {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="actions-${Date.now()}.csv"`,
        'cache-control': 'no-store',
      });
      return res.end(csv + `\n# rows=${rowCount}`);
    }

    return json(res, 404, { error: { code: 'not_found', message: `没有这个接口：${req.method} ${path}` } });
  } catch (err) {
    if (err instanceof ValidationError) {
      return json(res, err.status || 422, { error: { code: err.code, message: err.message } });
    }
    console.error('[unhandled]', err);
    return json(res, 500, { error: { code: 'internal', message: err.message } });
  }
}

