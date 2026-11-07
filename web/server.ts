import 'dotenv/config';
import { createServer } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import { bus, live } from './lib/bus';
import { getStatus } from './lib/data';
import { generateReport } from './lib/gemini';
import type { WsMessage } from './lib/types';

const dev = process.env.NODE_ENV !== 'production' && !process.argv.includes('--prod');
if (!dev) Object.assign(process.env, { NODE_ENV: 'production' });
const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535');

function nextMonday(now = new Date()) {
  const date = new Date(now);
  date.setHours(8, 0, 0, 0);
  date.setDate(date.getDate() + (8 - date.getDay()) % 7);
  if (date <= now) date.setDate(date.getDate() + 7);
  return date;
}

async function main() {
  const { default: next } = await import('next');
  const server = createServer();
  const app = next({ dev, port, httpServer: server });
  await app.prepare();
  const handle = app.getRequestHandler();
  server.on('request', (req, res) => {
    void handle(req, res).catch(error => {
      console.error(error);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unable to complete request' }));
      } else res.destroy();
    });
  });
  const wss = new WebSocketServer({ noServer: true, path: '/ws' });
  server.on('upgrade', (req, socket, head) => {
    if (req.url?.split('?')[0] === '/ws') wss.handleUpgrade(req, socket, head, client => wss.emit('connection', client));
  });
  wss.on('connection', client => {
    client.on('error', error => console.error('WebSocket error:', error.message));
    client.send(JSON.stringify({ kind: 'status', data: live.status } satisfies WsMessage));
  });
  const broadcast = (message: WsMessage) => {
    const payload = JSON.stringify(message);
    for (const client of wss.clients) {
      if (client.bufferedAmount > 1024 * 1024) client.terminate();
      else if (client.readyState === WebSocket.OPEN) client.send(payload);
    }
  };
  bus.on('message', broadcast);
  if (process.env.DATABASE_URL) {
    void getStatus().then(status => {
      live.status = status;
      broadcast({ kind: 'status', data: status });
    }).catch(error => console.error('Initial status unavailable:', error.message));
  }
  let timer: ReturnType<typeof setTimeout>;
  let closing = false;
  function schedule() {
    const due = nextMonday();
    timer = setTimeout(() => {
      const from = new Date(due);
      from.setDate(from.getDate() - 7);
      const report = process.env.GEMINI_API_KEY && process.env.DATABASE_URL
        ? generateReport('family', from.toISOString(), due.toISOString()) : Promise.resolve();
      void report.catch(error => console.error('Weekly family report failed:', error.message))
        .finally(() => { if (!closing) schedule(); });
    }, due.getTime() - Date.now());
    timer.unref();
  }
  schedule();
  server.listen(port, () => console.log(`AFO dashboard listening on http://localhost:${port}`));
  const close = () => {
    closing = true;
    clearTimeout(timer);
    bus.off('message', broadcast);
    for (const client of wss.clients) client.terminate();
    wss.close();
    server.close(() => { void app.close().then(() => process.exit(0)); });
  };
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
}

void main();
