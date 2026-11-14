// 演示时钟：日期由服务端按 Asia/Shanghai 计算。
// 客户端不能提交日期；“下一天”只改变本进程内的 offset，重启即回到真实日期。
export function createDemoClock({ timezone = 'Asia/Shanghai', now = () => Date.now() } = {}) {
  let offsetDays = 0;

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  function today() {
    const current = new Date(now() + offsetDays * 86400000);
    const parts = Object.fromEntries(
      formatter.formatToParts(current).map((p) => [p.type, p.value]),
    );
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  return {
    timezone,
    today,
    now: () => now() + offsetDays * 86400000,
    advanceDays(days = 1) {
      offsetDays += days;
      return today();
    },
    offsetDays: () => offsetDays,
    reset() {
      offsetDays = 0;
    },
  };
}

// 纯日期字符串的加减（用 UTC 避免本地时区干扰），仅用于种子数据。
export function shiftDay(dayKey, deltaDays) {
  const [y, m, d] = dayKey.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}
