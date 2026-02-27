import { once } from 'node:events';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { generateSessionId } from '../webSessionManager.js';
import { handleAPI } from './apiHandlers.js';
import { handleAuth } from './auth.js';
import { sendErrorResponse, sendRedirectResponse } from './httpUtils.js';
import { serveStatic } from './staticServer.js';

async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const pathname = url.pathname;
  const method = req.method || 'GET';

  if (await handleAuth(req, res, pathname, method)) return;

  if (pathname.startsWith('/api/')) {
    const handled = await handleAPI(req, res, pathname, method);
    if (!handled) {
      sendErrorResponse(res, 'Not found', 404);
    }
    return;
  }

  if (pathname === '/') {
    const qs = url.search;
    sendRedirectResponse(res, `/webSession/${generateSessionId()}${qs}`);
    return;
  }

  const wsIdMatch = pathname.match(/^\/webSession\/([a-z0-9-]+)$/);
  if (wsIdMatch) {
    if (serveStatic(res, '/index.html')) {
      return;
    }
  }

  if (!serveStatic(res, pathname)) {
    sendErrorResponse(res, 'Not found', 404);
  }
}

export async function startServer(
  port = 5281,
  host = 'localhost',
  tls?: https.ServerOptions,
): Promise<void> {
  const httpServer = http.createServer(handleRequest);
  const httpsServer = tls ? https.createServer(tls, handleRequest) : undefined;
  const server = httpsServer
    ? net.createServer(socket => {
      socket.once('data', buf => {
        socket.pause();
        (buf[0] === 0x16 ? httpsServer : httpServer).emit('connection', socket);
        socket.unshift(buf);
        socket.resume();
      });
      socket.on('error', () => {});
    })
    : httpServer;

  server.listen(port, host);
  await Promise.race([
    once(server, 'listening'),
    once(server, 'error').then(([err]) => {
      throw err;
    }),
  ]);
}
