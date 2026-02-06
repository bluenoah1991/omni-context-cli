import http from 'node:http';
import { remoteTransport } from '../../remoteToolBridge';

export async function handleRemotePoll(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<boolean> {
  await remoteTransport.handleRequest(req, res);
  return true;
}
