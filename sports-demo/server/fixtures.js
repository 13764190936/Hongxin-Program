// 全部为虚构演示数据：一家公司、两个团队、四名学习者。
// 没有用户数据库，也没有登录；身份切换只是本地演示开关。
export const org = {
  id: 'org-hongxin-demo',
  name: '鸿风科技（虚构演示公司）',
};

export const teams = [
  { id: 'team-alpha', name: '鸿风先锋队', orgId: org.id },
  { id: 'team-beta', name: '鸿风追风队', orgId: org.id },
];

export const users = [
  { id: 'u-anna', name: '林晓', role: '产品', teamId: 'team-alpha' },
  { id: 'u-bo', name: '周博', role: '研发', teamId: 'team-alpha' },
  { id: 'u-chen', name: '陈晨', role: '设计', teamId: 'team-beta' },
  { id: 'u-dee', name: '丁一一', role: '运营', teamId: 'team-beta' },
];

export function findUser(userId) {
  return users.find((u) => u.id === userId) || null;
}

export function findTeam(teamId) {
  return teams.find((t) => t.id === teamId) || null;
}

export function teamOf(user) {
  return findTeam(user.teamId);
}

// 对外展示用的身份列表（不含任何敏感字段）。
export function publicIdentities() {
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    role: u.role,
    teamId: u.teamId,
    teamName: findTeam(u.teamId)?.name ?? '未分组',
  }));
}
