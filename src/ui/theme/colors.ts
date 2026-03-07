export const colors = {
  primary: '#7aa2f7',
  secondary: '#7dcfff',
  accent: '#bb9af7',
  text: '#ffffff',
  muted: '#808080',
  info: '#9ece6a',
  warning: '#e0af68',
  error: '#f7768e',
} as const;

export type ColorTheme = typeof colors;
