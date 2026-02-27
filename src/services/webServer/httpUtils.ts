import http from 'node:http';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
  'Access-Control-Allow-Origin': '*',
};

export function parseRequestBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

export function sendJsonResponse(res: http.ServerResponse, data: any, status = 200) {
  res.writeHead(status, {'Content-Type': 'application/json', ...CORS_HEADERS});
  res.end(JSON.stringify(data));
}

export function sendErrorResponse(res: http.ServerResponse, message: string, status = 400) {
  sendJsonResponse(res, {error: message}, status);
}

export function startSseStream(res: http.ServerResponse) {
  res.writeHead(200, SSE_HEADERS);
}

export function sendSseEvent(res: http.ServerResponse, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export function sendRawResponse(res: http.ServerResponse, content: Buffer, contentType: string) {
  res.writeHead(200, {'Content-Type': contentType, ...CORS_HEADERS});
  res.end(content);
}

export function sendRedirectResponse(res: http.ServerResponse, location: string) {
  res.writeHead(302, {Location: location});
  res.end();
}

export function sendNoContentResponse(res: http.ServerResponse) {
  res.writeHead(204, CORS_HEADERS);
  res.end();
}
