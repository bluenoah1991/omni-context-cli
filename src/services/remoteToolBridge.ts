import { ToolDefinition, ToolExecutionResult } from '../types/tool';
import { LongPollTransport } from './longPollTransport';

interface RemoteClientRequest {
  clientType: string;
  toolDefinitions: ToolDefinition[];
  toolResult?: ToolExecutionResult;
}

interface RemoteClientResponse {
  toolCall: {name: string; input: Record<string, unknown>;};
}

interface RemoteClient {
  heartbeat: number;
  toolDefinitions: ToolDefinition[];
}

interface PendingCall {
  resolve: (result: ToolExecutionResult) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

const REMOTE_PREFIX = 'remote_';
const TIMEOUT_MS = 120000;

const remoteClients = new Map<string, RemoteClient>();
const pendingCalls = new Map<string, PendingCall>();

export function getRemoteToolDefinitions(): ToolDefinition[] {
  const definitions: ToolDefinition[] = [];

  for (const [clientType, client] of remoteClients) {
    if (Date.now() - client.heartbeat > TIMEOUT_MS) continue;

    for (const tool of client.toolDefinitions) {
      const name = `${REMOTE_PREFIX}${clientType}_${tool.name}`;
      definitions.push({
        name,
        description: `[${clientType}] ${tool.description}`,
        parameters: tool.parameters,
        formatCall: args => `${name}: ${JSON.stringify(args)}`,
      });
    }
  }

  return definitions;
}

export function isRemoteTool(toolName: string): boolean {
  return toolName.startsWith(REMOTE_PREFIX);
}

export async function executeRemoteTool(
  toolName: string,
  args: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const unprefixed = toolName.slice(REMOTE_PREFIX.length);
  const sep = unprefixed.indexOf('_');
  const clientType = unprefixed.slice(0, sep);
  const client = remoteClients.get(clientType);

  if (!client || Date.now() - client.heartbeat > TIMEOUT_MS) {
    return {success: false, error: `No remote client for tool: ${toolName}`};
  }

  const remoteToolName = unprefixed.slice(sep + 1);

  return new Promise(resolve => {
    const timeoutId = setTimeout(() => {
      pendingCalls.delete(clientType);
      resolve({success: false, error: 'Tool call timed out'});
    }, TIMEOUT_MS);

    pendingCalls.set(clientType, {resolve, timeoutId});
    const response: RemoteClientResponse = {toolCall: {name: remoteToolName, input: args}};
    remoteTransport.send(clientType, response);
  });
}

export const remoteTransport = new LongPollTransport({
  handlePoll: (body: RemoteClientRequest) => {
    if (!body.clientType || !body.toolDefinitions) {
      return null;
    }

    const clientType = body.clientType;
    remoteClients.set(clientType, {heartbeat: Date.now(), toolDefinitions: body.toolDefinitions});

    if (body.toolResult) {
      resolvePendingCall(clientType, body.toolResult);
    }

    return clientType;
  },

  onDisconnect: clientType => {
    resolvePendingCall(clientType, {success: false, error: 'Client disconnected'});
  },
});

function resolvePendingCall(clientId: string, result: ToolExecutionResult): void {
  const pending = pendingCalls.get(clientId);
  if (pending) {
    clearTimeout(pending.timeoutId);
    pendingCalls.delete(clientId);
    pending.resolve(result);
  }
}
