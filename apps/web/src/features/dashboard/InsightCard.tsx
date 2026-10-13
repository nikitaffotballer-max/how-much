import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { CoffeeIllustration } from '../../illustrations/CoffeeIllustration';
import { hcColors } from '../../theme/hcTheme';

/**
 * Подсказка-инсайт. Пока текст статичный, как в макете;
 * на этапе 2 его будет формировать LLM по посчитанным цифрам (ТЗ, 3.8).
 */
export function InsightCard() {
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h2" id="insight-title">
          Хм, кофе
        </Typography>
        <Box
          sx={{
            fontSize: 11,
            fontWeight: 700,
            color: hcColors.insightAccent,
            bgcolor: '#FFFFFF',
            px: 1,
            py: 0.375,
            borderRadius: 2,
          }}
        >
          PRO
        </Box>
      </Box>
      <Box sx={{ alignSelf: 'center' }}>
        <CoffeeIllustration />
      </Box>
      <Typography sx={{ fontSize: 16, lineHeight: 1.45 }}>
        <b>2 100 ₽</b> на капучино за 13 дней — это 7 чашек в кофейне на Лесной.
      </Typography>
      <Button variant="contained" sx={{ alignSelf: 'flex-start', bgcolor: hcColors.insightAccent }}>
        Поставить бюджет
      </Button>
    </Box>
  );
}
