export type ColorTheme = {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  muted: string;
  info: string;
  warning: string;
  error: string;
};

export type ThemePreset =
  | 'tokyo-night'
  | 'rose-pine'
  | 'catppuccin'
  | 'nord'
  | 'everforest'
  | 'kanagawa'
  | 'hacker-green';

export const themePresets: Record<ThemePreset, ColorTheme> = {
  'tokyo-night': {
    primary: '#7aa2f7',
    secondary: '#7dcfff',
    accent: '#bb9af7',
    text: '#c0caf5',
    muted: '#565f89',
    info: '#9ece6a',
    warning: '#e0af68',
    error: '#f7768e',
  },
  'rose-pine': {
    primary: '#31748f',
    secondary: '#9ccfd8',
    accent: '#c4a7e7',
    text: '#e0def4',
    muted: '#6e6a86',
    info: '#9ccfd8',
    warning: '#f6c177',
    error: '#eb6f92',
  },
  catppuccin: {
    primary: '#89b4fa',
    secondary: '#89dceb',
    accent: '#cba6f7',
    text: '#cdd6f4',
    muted: '#6c7086',
    info: '#a6e3a1',
    warning: '#f9e2af',
    error: '#f38ba8',
  },
  nord: {
    primary: '#81a1c1',
    secondary: '#88c0d0',
    accent: '#b48ead',
    text: '#eceff4',
    muted: '#4c566a',
    info: '#a3be8c',
    warning: '#ebcb8b',
    error: '#bf616a',
  },
  everforest: {
    primary: '#7fbbb3',
    secondary: '#83c092',
    accent: '#d699b6',
    text: '#d3c6aa',
    muted: '#859289',
    info: '#a7c080',
    warning: '#dbbc7f',
    error: '#e67e80',
  },
  kanagawa: {
    primary: '#7e9cd8',
    secondary: '#7fb4ca',
    accent: '#957fb8',
    text: '#dcd7ba',
    muted: '#727169',
    info: '#98bb6c',
    warning: '#e6c384',
    error: '#e46876',
  },
  'hacker-green': {
    primary: '#00ff00',
    secondary: '#00cc00',
    accent: '#39ff14',
    text: '#00ff00',
    muted: '#006600',
    info: '#33ff33',
    warning: '#ccff00',
    error: '#ff3333',
  },
};

export const colors: ColorTheme = {...themePresets['tokyo-night']};

export function applyTheme(preset: ThemePreset): void {
  const theme = themePresets[preset];
  if (!theme) return;
  Object.assign(colors, theme);
}
