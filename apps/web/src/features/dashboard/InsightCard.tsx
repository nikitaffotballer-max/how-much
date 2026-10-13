import { formatRub, shareOf, type DashboardSummary } from '@how-much/shared';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { CoffeeIllustration } from '../../illustrations/CoffeeIllustration';
import { hcColors } from '../../theme/hcTheme';

/**
 * Подсказка про кафе и кофе — самую «незаметную» статью расходов.
 * На этапе 2 подсказки будет формулировать LLM по посчитанным цифрам (ТЗ, 3.8).
 */
export function InsightCard({ byCategory }: Pick<DashboardSummary, 'byCategory'>) {
  const total = byCategory.reduce((sum, c) => sum + c.total, 0);
  const cafe = byCategory.find((c) => c.category === 'cafe')?.total ?? 0;
  if (cafe <= 0) return null;

  return (
    <Box
      component="section"
      aria-labelledby="insight-title"
      sx={{
        flex: '1 1 300px',
        minWidth: 0,
        bgcolor: hcColors.insightContainer,
        color: hcColors.onInsightContainer,
        borderRadius: 7,
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      <Typography variant="h2" id="insight-title">
        Хм, кофе
      </Typography>
      <Box sx={{ alignSelf: 'center' }}>
        <CoffeeIllustration />
      </Box>
      <Typography sx={{ fontSize: 16, lineHeight: 1.45 }}>
        <b>{formatRub(cafe)}</b> на кафе и кофе с начала месяца — это {shareOf(cafe, total)}% всех
        трат.
      </Typography>
    </Box>
  );
}
