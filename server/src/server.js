import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handle } from './api.js';
import { getDb, dbPath } from './db.js';

const ROOT = fileURLToPath(new URL('../public', import.meta.url));
const PORT = Number(process.env.PORT || 8787);

// 首次启动时数据库不存在，自动写入虚构数据，避免打开就是空页面
const DB_FILE = process.env.HX_DB || join(process.cwd(), 'data/hongxin.db');
if (!existsSync(DB_FILE)) {
  console.log('未发现数据库，正在写入虚构测试数据…\n');
  execFileSync(process.execPath, [join(process.cwd(), 'src/seed.js')], { stdio: 'inherit' });
}
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

async function serveStatic(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
  const alias = { '/debug': '/debug.html', '/showcase': '/showcase.html' }[pathname] || pathname;
  const file = join(ROOT, normalize(alias).replace(/^(\.\.[/\\])+/, ''));
  try {
    const buf = await readFile(file);
    res.writeHead(200, {
      'content-type': MIME[extname(file)] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(buf);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('404');
  }
}

const server = createServer(async (req, res) => {
  if (req.url.startsWith('/api/')) return handle(req, res);
  return serveStatic(req, res);
});

getDb();
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`\n  端口 ${PORT} 已被占用。可能是上一次的窗口还开着。`);
    console.error('  先关掉那个终端窗口，或换端口：PORT=8788 npm start\n');
    process.exit(1);
  }
  throw e;
});
server.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('  鸿心课程行动 · 已启动');
  console.log(`  员工端   http://127.0.0.1:${PORT}/`);
  console.log(`  主管视角 http://127.0.0.1:${PORT}/showcase`);
  console.log(`  技术台   http://127.0.0.1:${PORT}/debug`);
  console.log(`  数据库   ${dbPath()}`);
  console.log('');
  console.log('  ⚠ 这个窗口要一直开着，关掉服务就停了。停止请按 Control + C。');
  console.log('');
});
