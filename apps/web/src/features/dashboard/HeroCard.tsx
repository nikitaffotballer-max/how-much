import { formatRub, type DashboardSummary } from '@how-much/shared';
import ArrowDownwardRounded from '@mui/icons-material/ArrowDownwardRounded';
import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { ReceiptCoinsIllustration } from '../../illustrations/ReceiptCoinsIllustration';
import { hcColors } from '../../theme/hcTheme';

type HeroCardProps = Pick<DashboardSummary, 'total' | 'previousTotal'>;

/** Главная цифра месяца и сравнение с тем же периодом прошлого месяца. */
export function HeroCard({ total, previousTotal }: HeroCardProps) {
  const diff = total - previousTotal;
  const change = previousTotal === 0 ? 0 : diff / previousTotal;
  const spentLess = diff <= 0;
  const ArrowIcon = spentLess ? ArrowDownwardRounded : ArrowUpwardRounded;

  return (
    <Box
      component="section"
      aria-labelledby="hero-total"
      sx={{
        bgcolor: hcColors.heroContainer,
        borderRadius: 7,
        px: { xs: 3, md: 4.5 },
        py: 4,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 3,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flex: '1 1 320px' }}>
        <Typography sx={{ fontSize: 16, fontWeight: 500, color: '#0B3B27' }}>
          Потрачено с начала месяца
        </Typography>
        <Typography
          id="hero-total"
          sx={{
            fontSize: { xs: 44, md: 56 },
            fontWeight: 700,
            letterSpacing: '-0.03em',
            lineHeight: 1,
            color: hcColors.onPrimaryContainer,
          }}
        >
          {formatRub(total)}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.25 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              minHeight: 32,
              px: 1.5,
              borderRadius: 4,
              bgcolor: '#FFFFFF',
              color: spentLess ? '#00513A' : hcColors.tertiaryStrong,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            <ArrowIcon sx={{ fontSize: 16 }} />
            {Math.round(Math.abs(change) * 100)}% к прошлому месяцу
          </Box>
          <Typography sx={{ fontSize: 15, color: '#0B3B27' }}>
            на {formatRub(Math.abs(diff))} {spentLess ? 'меньше' : 'больше'}, чем за те же дни
          </Typography>
        </Box>
      </Box>
      <ReceiptCoinsIllustration />
    </Box>
  );
}
