import { users, teams, findUser, findTeam } from '../fixtures.js';

const AGGREGATIONS = {
  // 演示默认：团队当日成员数值求和
  sum(values) {
    return values.reduce((total, v) => total + v, 0);
  },
  // 预留示例：后续可在 config.teamAggregation 切到平均
  avg(values) {
    return values.length ? values.reduce((total, v) => total + v, 0) / values.length : 0;
  },
};

function round2(value) {
  return Math.round(value * 100) / 100;
}

function withRanks(entries, compareName) {
  const sorted = [...entries].sort((a, b) => b.value - a.value || compareName(a, b));
  let previousValue = null;
  let previousRank = 0;
  return sorted.map((entry, index) => {
    const rank = entry.value === previousValue ? previousRank : index + 1;
    previousValue = entry.value;
    previousRank = rank;
    return { ...entry, rank };
  });
}

export function createRankService({ repo, clock, config }) {
  function metricValues(day, metric) {
    const values = new Map();
    if (metric === 'steps') {
      for (const record of repo.listStepsByDay(day)) {
        if (findUser(record.userId)) values.set(record.userId, record.steps);
      }
    } else {
      for (const run of repo.listRunsByDay(day)) {
        if (findUser(run.userId)) values.set(run.userId, run.distanceKm);
      }
    }
    return values;
  }

  function build(metric) {
    const day = clock.today();
    const values = metricValues(day, metric);

    const personal = [...values.entries()].map(([userId, value]) => {
      const user = findUser(userId);
      return {
        userId,
        name: user.name,
        teamId: user.teamId,
        teamName: findTeam(user.teamId)?.name ?? '未分组',
        value: round2(value),
      };
    });

    const byTeam = new Map();
    for (const team of teams) byTeam.set(team.id, []);
    for (const [userId, value] of values.entries()) {
      const user = findUser(userId);
      if (byTeam.has(user.teamId)) byTeam.get(user.teamId).push(value);
    }

    const aggregate = AGGREGATIONS[config.teamAggregation] ?? AGGREGATIONS.sum;
    const team = [...byTeam.entries()]
      .filter(([, memberValues]) => memberValues.length > 0)
      .map(([teamId, memberValues]) => {
        const teamInfo = findTeam(teamId);
        return {
          teamId,
          name: teamInfo.name,
          value: round2(aggregate(memberValues)),
          participants: memberValues.length,
          memberTotal: users.filter((u) => u.teamId === teamId).length,
        };
      });

    return {
      day,
      metric,
      teamAggregation: config.teamAggregation,
      generatedAt: new Date(clock.now()).toISOString(),
      tieRule: '数值相同并列同一名次，展示顺序按名称排序；团队默认按成员当日数值求和',
      personal: withRanks(personal, (a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN')),
      team: withRanks(team, (a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN')),
    };
  }

  return { build };
}
