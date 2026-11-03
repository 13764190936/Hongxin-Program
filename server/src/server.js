import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handle } from './api.js';
import { getDb, dbPath } from './db.js';

const ROOT = fileURLToPath(new URL('../public', import.meta.url));
const PORT = Number(process.env.PORT || 8787);
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
  const alias = { '/debug': '/debug.html' }[pathname] || pathname;
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
server.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('  鸿心课程行动 · 后端已启动');
  console.log(`  演示页   http://127.0.0.1:${PORT}/`);
  console.log(`  健康检查 http://127.0.0.1:${PORT}/api/health`);
  console.log(`  数据库   ${dbPath()}`);
  console.log('');
  console.log('  按 Ctrl+C 停止');
  console.log('');
});
