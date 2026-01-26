import { spawn } from 'child_process';
import commitMessagePrompt from '../prompts/commit-message.txt';
import { extractTextContent } from '../utils/messageUtils';
import { runConversation } from './chatOrchestrator';
import { getAgentModel, loadAppConfig } from './configManager';
import { addUserMessage, createSession } from './sessionManager';

function runGitCommand(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', data => {
      stdout += data.toString();
    });

    child.stderr?.on('data', data => {
      stderr += data.toString();
    });

    child.on('close', code => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(stderr.trim() || `git exited with code ${code}`));
      }
    });

    child.on('error', reject);
  });
}

async function getStagedDiff(): Promise<string> {
  return runGitCommand(['diff', '--staged']);
}

async function getStagedFiles(): Promise<string[]> {
  const output = await runGitCommand(['diff', '--staged', '--name-only']);
  return output.split('\n').filter(Boolean);
}

async function commitWithMessage(message: string): Promise<string> {
  return runGitCommand(['commit', '-m', message]);
}

async function generateCommitMessage(
  diff: string,
  files: string[],
  signal?: AbortSignal,
): Promise<string> {
  const appConfig = loadAppConfig();
  const agentModel = getAgentModel(appConfig);

  if (!agentModel) {
    throw new Error('No agent model configured');
  }

  const prompt = commitMessagePrompt.replace('{{FILES}}', files.join('\n')).replace(
    '{{DIFF}}',
    diff.slice(0, 8000),
  );

  const session = createSession(agentModel);
  const sessionWithMessage = addUserMessage(session, prompt, agentModel.provider);

  const result = await runConversation(
    sessionWithMessage,
    undefined,
    signal,
    {excludeAgents: true, excludeMcp: true, allowedTools: []},
    agentModel,
    true,
    false,
    true,
  );

  if (signal?.aborted) {
    throw new Error('Git commit was interrupted');
  }

  const lastMessage = result.messages[result.messages.length - 1];
  let message = extractTextContent(lastMessage).trim();

  if (message.includes('```')) {
    const start = message.indexOf('```') + 3;
    const end = message.indexOf('```', start);
    if (end > start) {
      message = message.slice(start, end).trim();
    }
  }

  return message;
}

export async function executeGitCommit(signal?: AbortSignal): Promise<{message: string;}> {
  try {
    const stagedFiles = await getStagedFiles();

    if (stagedFiles.length === 0) {
      return {message: 'Nothing staged to commit. Use `git add` first.'};
    }

    const diff = await getStagedDiff();

    if (!diff) {
      return {message: 'No changes detected in staged files.'};
    }

    const commitMessage = await generateCommitMessage(diff, stagedFiles, signal);

    if (signal?.aborted) {
      return {message: 'Git commit cancelled.'};
    }

    const commitResult = await commitWithMessage(commitMessage);

    return {message: `Committed with message:\n\n  ${commitMessage}\n\n${commitResult}`};
  } catch (err) {
    if (signal?.aborted) {
      return {message: 'Git commit cancelled.'};
    }
    return {message: `Failed to commit: ${err instanceof Error ? err.message : String(err)}`};
  }
}
