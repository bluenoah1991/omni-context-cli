export const colors = {
  primary: 'green',
  secondary: 'cyan',
  tertiary: 'magenta',
  text: {default: 'white', dimmed: 'gray', error: 'red'},
} as const;

export type ColorTheme = typeof colors;
