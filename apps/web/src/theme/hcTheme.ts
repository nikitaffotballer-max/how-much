import { createTheme } from '@mui/material/styles';

/**
 * Цвета Material 3, которых нет в стандартной палитре MUI (container-цвета, поверхности).
 * Значения взяты из макета docs/design/DashboardM3.dc.html.
 */
export const hcColors = {
  primary: '#006C4C',
  onPrimaryContainer: '#002114',
  primaryContainer: '#B5F2D3',
  heroContainer: '#C4F1DA',
  secondaryContainer: '#CFE9DA',
  onSecondaryContainer: '#0B1F16',
  tertiary: '#B4541A',
  tertiaryContainer: '#FFDBC8',
  onTertiaryContainer: '#3A1400',
  tertiaryStrong: '#8F3A0C',
  insightContainer: '#EEE0FF',
  onInsightContainer: '#2E1A52',
  insightAccent: '#6A3BB0',
  background: '#F7FAF5',
  surfaceContainer: '#EEF3EC',
  surfaceContainerHigh: '#E5EAE3',
  onSurface: '#181D1A',
  onSurfaceVariant: '#404943',
  outlineVariant: '#C0C9C1',
} as const;

export const hcTheme = createTheme({
  palette: {
    primary: { main: hcColors.primary },
    secondary: { main: hcColors.tertiary },
    background: { default: hcColors.background, paper: '#FFFFFF' },
    text: { primary: hcColors.onSurface, secondary: hcColors.onSurfaceVariant },
    divider: hcColors.outlineVariant,
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: "'Onest', system-ui, sans-serif",
    h1: { fontSize: 28, fontWeight: 700, letterSpacing: '-0.01em' },
    h2: { fontSize: 20, fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: { body: { fontVariantNumeric: 'tabular-nums' } },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { borderRadius: 24 } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 20, minHeight: 40, paddingInline: 20 } },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 10, fontWeight: 500 } },
    },
  },
});
