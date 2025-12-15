import { useStdout } from 'ink';

const DEFAULT_MARGIN = 8;

export function useContentWidth(margin: number = DEFAULT_MARGIN): number {
  const {stdout} = useStdout();
  const terminalWidth = stdout?.columns || 80;
  return Math.max(40, terminalWidth - margin);
}
