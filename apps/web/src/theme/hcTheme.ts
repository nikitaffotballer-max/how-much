import { createTheme } from '@mui/material/styles';

/** Кривая Material 3 «emphasized decelerate» — для появления элементов. */
export const HC_EASING = 'cubic-bezier(0.05, 0.7, 0.1, 1)';

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
  // Базовая единица скругления: в sx borderRadius: 3 → 12 px, 4 → 16 px.
  shape: { borderRadius: 4 },
  typography: {
    fontFamily: "'Onest', system-ui, sans-serif",
    h1: { fontSize: 28, fontWeight: 700, letterSpacing: '-0.01em' },
    h2: { fontSize: 20, fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { fontVariantNumeric: 'tabular-nums' },
        // Анимации Material 3: «выразительное замедление» — быстрый старт, мягкая посадка.
        '@keyframes hc-fade-up': {
          from: { opacity: 0, transform: 'translateY(8px)' },
          to: { opacity: 1, transform: 'none' },
        },
        '@keyframes hc-grow-x': { from: { transform: 'scaleX(0)' }, to: { transform: 'none' } },
        '@keyframes hc-grow-y': { from: { transform: 'scaleY(0)' }, to: { transform: 'none' } },
        /** Новая страница появляется, а не возникает рывком. */
        '.hc-page': { animation: `hc-fade-up 280ms ${HC_EASING}` },
        /** Блоки внутри появляются по очереди, сверху вниз. */
        '.hc-stagger > *': {
          animation: `hc-fade-up 360ms ${HC_EASING} both`,
          ...Object.fromEntries(
            Array.from({ length: 8 }, (_, i) => [
              `&:nth-of-type(${i + 1})`,
              { animationDelay: `${i * 45}ms` },
            ]),
          ),
        },
        '.hc-grow-x': {
          transformOrigin: 'left',
          animation: `hc-grow-x 600ms ${HC_EASING} 120ms both`,
        },
        '.hc-grow-y': {
          transformOrigin: 'bottom',
          animation: `hc-grow-y 600ms ${HC_EASING} 120ms both`,
        },
        // Кому от движения плохо, тот включил это в системе — уважаем.
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '1ms !important',
            animationDelay: '0ms !important',
            transitionDuration: '1ms !important',
          },
        },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { borderRadius: 16 } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 12, minHeight: 40, paddingInline: 20 } },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 8, fontWeight: 500 } },
    },
  },
});
