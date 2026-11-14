import { config } from './config.js';
import { createDemoClock } from './clock.js';
import { createMemoryRepository } from './store.js';
import { seedDemoData } from './seed.js';
import { createMockStepSource } from './adapters/mockStepSource.js';
import { createMockRunAnalyzer } from './adapters/mockRunAnalyzer.js';
import { createApp, createHttpServer } from './app.js';

const repo = createMemoryRepository();
const clock = createDemoClock({ timezone: config.timezone });
seedDemoData(repo, clock);

const app = createApp({
  repo,
  clock,
  config,
  seed: seedDemoData,
  stepSource: createMockStepSource(),
  analyzer: createMockRunAnalyzer(),
});

const server = createHttpServer(app);
server.listen(config.port, config.host, () => {
  console.log(`[sports-demo] DEMO ONLY · mock data · http://${config.host}:${config.port}`);
  console.log(`[sports-demo] day=${clock.today()} timezone=${config.timezone} pid=${process.pid}`);
  console.log('[sports-demo] 数据仅存内存，重启即重置；无登录、无真实微信/OCR');
});

server.on('error', (error) => {
  console.error('[sports-demo] 启动失败:', error.message);
  process.exit(1);
});

function shutdown(signal) {
  console.log(`[sports-demo] 收到 ${signal}，正在关闭…`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
