export const colors = {
  primary: 'blue',
  secondary: 'cyan',
  accent: 'magenta',
  text: 'white',
  muted: 'gray',
  info: 'green',
  warning: 'yellow',
  error: 'red',
} as const;

export type ColorTheme = typeof colors;
