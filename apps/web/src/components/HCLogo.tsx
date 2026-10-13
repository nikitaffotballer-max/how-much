import Box from '@mui/material/Box';
import { hcColors } from '../theme/hcTheme';

/** Знак «хм» в форме чека + надпись «хаумач». */
export function HCLogo() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
      <svg width="34" height="34" viewBox="0 0 40 40" role="img" aria-label="Хау мач">
        <path
          d="M8 2H32A6 6 0 0 1 38 8V36L34.4 33L30.8 36L27.2 33L23.6 36L20 33L16.4 36L12.8 33L9.2 36L5.6 33L2 36V8A6 6 0 0 1 8 2Z"
          fill={hcColors.primary}
        />
        <text
          x="20"
          y="24.5"
          textAnchor="middle"
          fontFamily="Onest, system-ui, sans-serif"
          fontSize="17"
          fontWeight="700"
          fill="#FFFFFF"
          letterSpacing="-0.5"
        >
          хм
        </text>
      </svg>
      <Box
        component="span"
        aria-hidden
        sx={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em' }}
      >
        <Box component="span" sx={{ fontWeight: 500 }}>
          хау
        </Box>
        <Box component="span" sx={{ color: hcColors.primary }}>
          мач
        </Box>
      </Box>
    </Box>
  );
}
