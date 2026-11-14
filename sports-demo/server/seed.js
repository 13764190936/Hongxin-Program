import crypto from 'node:crypto';
import { shiftDay } from './clock.js';
import { users, teams, org } from './fixtures.js';

// 种子数据：让排行榜首次打开就有内容，同时让默认身份“林晓”今天没有跑步记录，
// 方便用户自己上传截图体验。昨天/前天的步数用于展示“历史总步数保留”。
const STEPS_BY_DAY_OFFSET = {
  0: { 'u-anna': 6800, 'u-bo': 9200, 'u-chen': 7400, 'u-dee': 5100 },
  [-1]: { 'u-anna': 8200, 'u-bo': 10100, 'u-chen': 6300, 'u-dee': 12800 },
  [-2]: { 'u-anna': 9300, 'u-bo': 7600, 'u-chen': 8800, 'u-dee': 6100 },
};

const RUNS_BY_DAY_OFFSET = {
  0: [
    { userId: 'u-bo', distanceKm: 4.2, minutes: 26 },
    { userId: 'u-chen', distanceKm: 2.6, minutes: 18 },
  ],
  [-1]: [
    { userId: 'u-anna', distanceKm: 5.0, minutes: 30 },
    { userId: 'u-dee', distanceKm: 3.4, minutes: 21 },
  ],
};

// 种子图片不是可展示的截图，只需要独立的字节内容参与 SHA256 去重；
// 以真实 PNG 魔数开头，避免被误认为“假文件也能过校验”。
function seedImageBytes(label) {
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.from(`sports-demo-seed:${label}`),
  ]);
}

export function seedDemoData(repo, clock) {
  const today = clock.today();
  const nowIso = new Date(clock.now()).toISOString();

  for (const [offset, values] of Object.entries(STEPS_BY_DAY_OFFSET)) {
    const day = shiftDay(today, Number(offset));
    for (const [userId, steps] of Object.entries(values)) {
      repo.putStep({
        day,
        userId,
        steps,
        source: 'mock-wechat-snapshot',
        simulated: true,
        updatedAt: nowIso,
      });
    }
  }

  for (const [offset, runs] of Object.entries(RUNS_BY_DAY_OFFSET)) {
    const day = shiftDay(today, Number(offset));
    for (const run of runs) {
      const user = users.find((u) => u.id === run.userId);
      const bytes = seedImageBytes(`${day}:${run.userId}`);
      repo.insertRun({
        id: crypto.randomUUID(),
        userId: run.userId,
        userName: user?.name ?? '未知',
        teamId: user?.teamId ?? null,
        day,
        distanceKm: run.distanceKm,
        minutes: run.minutes,
        sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
        imageBytes: bytes.length,
        mime: 'image/png',
        analysis: {
          mode: 'mock',
          mock: true,
          note: '演示种子数据（模拟值，不是真实截图识别）',
        },
        createdAt: nowIso,
        seeded: true,
      });
    }
  }
}

export function fixtureOverview() {
  return {
    org,
    teams: teams.map((t) => ({
      id: t.id,
      name: t.name,
      members: users.filter((u) => u.teamId === t.id).map((u) => u.name),
    })),
  };
}

