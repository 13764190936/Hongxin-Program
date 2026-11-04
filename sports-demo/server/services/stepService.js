import { assert } from '../errors.js';

export function createStepService({ repo, clock, stepSource }) {
  async function syncMockSnapshot(user, body) {
    const steps = body?.steps;
    assert(
      typeof steps === 'number' && Number.isInteger(steps) && steps >= 0,
      400,
      'STEPS_INVALID',
      '步数必须是大于等于 0 的整数（模拟快照的当日绝对步数）',
    );
    assert(Number.isSafeInteger(steps), 400, 'STEPS_INVALID', '步数超出可处理范围');

    const day = clock.today();
    const snapshot = await stepSource.snapshot({ userId: user.id, day, absoluteSteps: steps });
    const record = {
      day,
      userId: user.id,
      steps: snapshot.steps,
      source: snapshot.source,
      simulated: true,
      note: snapshot.note,
      updatedAt: new Date(clock.now()).toISOString(),
    };
    repo.putStep(record);

    return {
      record,
      todaySteps: record.steps,
      totalSteps: totalSteps(user.id),
      day,
      mock: true,
      disclaimer: '模拟步数快照：仅用于演示，服务端不接入真实微信数据',
    };
  }

  function totalSteps(userId) {
    return repo
      .listStepsByUser(userId)
      .reduce((sum, record) => sum + record.steps, 0);
  }

  function todaySteps(userId) {
    return repo.getStep(clock.today(), userId)?.steps ?? 0;
  }

  return { syncMockSnapshot, totalSteps, todaySteps };
}
