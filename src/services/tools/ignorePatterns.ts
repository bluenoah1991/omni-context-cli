export const COMMON_IGNORE_PATTERNS: string[] = [
  '**/node_modules/**',
  '**/.git/**',
  '**/bower_components/**',
  '**/.svn/**',
  '**/.hg/**',
];

export function getCoreIgnorePatterns(): string[] {
  return [...COMMON_IGNORE_PATTERNS];
}

export function getGlobExcludes(additionalExcludes: string[] = []): string[] {
  return [...getCoreIgnorePatterns(), ...additionalExcludes];
}
