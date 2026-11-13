export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'smart_ai_theme_mode';

/**
 * Resolve the effective theme ('light' or 'dark') from a user preference and system dark flag.
 */
export function resolveThemeMode(mode: ThemeMode, systemPrefersDark: boolean): ResolvedTheme {
  if (mode === 'system') {
    return systemPrefersDark ? 'dark' : 'light';
  }
  return mode;
}

/**
 * Safely parse a stored theme string into a valid ThemeMode. Defaults to 'light' (Brown Cream).
 */
export function parseStoredThemeMode(raw: string | null | undefined): ThemeMode {
  if (raw === 'light' || raw === 'dark' || raw === 'system') {
    return raw;
  }
  return 'light';
}

export interface ChartThemeTokens {
  isDark: boolean;
  cardBg: string;
  secondaryBg: string;
  gridStroke: string;
  axisStroke: string;
  axisTickColor: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  primary: string;
  secondary: string;
  caramel: string;
  cream: string;
  success: string;
  warning: string;
  danger: string;
  ciBandFill: string;
  ciBandMask: string;
  palette: string[];
}

/**
 * Return consistent Recharts / visualization color tokens for Light (Brown Cream) and Dark (Dark Brown) modes.
 */
export function getChartThemeTokens(resolved: ResolvedTheme): ChartThemeTokens {
  if (resolved === 'dark') {
    return {
      isDark: true,
      cardBg: '#332A25',
      secondaryBg: '#3B3029',
      gridStroke: '#4A3C33',
      axisStroke: '#C1B1A1',
      axisTickColor: '#C1B1A1',
      tooltipBg: '#29221E',
      tooltipBorder: '#4A3C33',
      tooltipText: '#F5EDE3',
      primary: '#B38B68',
      secondary: '#A1887F',
      caramel: '#D1A575',
      cream: '#E5D1B5',
      success: '#80B493',
      warning: '#E0B16C',
      danger: '#DC8278',
      ciBandFill: '#D1A575',
      ciBandMask: '#332A25',
      palette: ['#D1A575', '#B38B68', '#80B493', '#E0B16C', '#E5D1B5', '#A1887F', '#DC8278', '#8D6E63', '#C49A6C']
    };
  }

  return {
    isDark: false,
    cardBg: '#FFFDF9',
    secondaryBg: '#EEE5D9',
    gridStroke: '#DED3C5',
    axisStroke: '#796B60',
    axisTickColor: '#796B60',
    tooltipBg: '#FFFDF9',
    tooltipBorder: '#DED3C5',
    tooltipText: '#382E27',
    primary: '#795548',
    secondary: '#A1887F',
    caramel: '#C49A6C',
    cream: '#DCC6A1',
    success: '#4F8065',
    warning: '#C58B42',
    danger: '#B85C50',
    ciBandFill: '#C49A6C',
    ciBandMask: '#FFFDF9',
    palette: ['#795548', '#C49A6C', '#4F8065', '#C58B42', '#A1887F', '#B85C50', '#8D6E63', '#6D4C41', '#D1A575']
  };
}
