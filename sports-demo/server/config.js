// 集中配置。演示默认值都在这里，便于后续替换真实实现。
export const config = {
  host: '127.0.0.1', // 只监听本机，绝不对外网开放
  port: Number(process.env.PORT || 8790),
  timezone: 'Asia/Shanghai',
  maxBodyBytes: 4 * 1024 * 1024, // JSON 请求体上限（base64 图片比原图大约 4/3）
  maxImageBytes: 2 * 1024 * 1024, // 解码后图片上限
  maxIdempotencyKeyLength: 120,

  // 团队日榜聚合策略。当前只有 sum（演示默认）；
  // 后续可在此注册 avg 等函数，rankService 已按策略查表调用。
  teamAggregation: 'sum',

  // 跑步图片 SHA256 去重范围：demo 内全局（跨人、跨天）。
  // 生产可改为按组织/日期等范围，避免“同一张图”被滥用。
  duplicateScope: 'global-demo',

  // 演示身份开关：默认第一个人；仅用于本地演示，不是登录系统。
  defaultUserId: 'u-anna',

  // 重置演示需要显式确认字符串，避免误触。
  resetConfirmToken: 'RESET',
};
