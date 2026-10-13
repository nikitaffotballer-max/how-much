import { formatRub, type DashboardSummary } from '@how-much/shared';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { dayOfMonth } from '../../lib/dates';
import { hcColors } from '../../theme/hcTheme';

const CHART_HEIGHT = 160;

/** Столбики трат по дням. Самый дорогой день — оранжевый с подписью, последний — тёмно-зелёный. */
export function DailySpendingCard({ byDay }: Pick<DashboardSummary, 'byDay'>) {
  const max = Math.max(...byDay.map((d) => d.total), 1);
  const peak = byDay.find((d) => d.total === max);

  return (
    <Box
      component="section"
      aria-labelledby="daily-title"
      sx={{
        flex: '2 1 460px',
        minWidth: 0,
        bgcolor: '#FFFFFF',
        borderRadius: 4,
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Typography variant="h2" id="daily-title">
        Траты по дням
      </Typography>
      <Box
        role="img"
        aria-label={
          peak
            ? `Больше всего потрачено ${dayOfMonth(peak.date)}-го числа: ${formatRub(peak.total)}`
            : 'Нет трат'
        }
        sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.75, height: CHART_HEIGHT + 72 }}
      >
        {byDay.map((day, index) => {
          const isPeak = day === peak;
          const isLast = index === byDay.length - 1;
          const color = isPeak ? '#F08A4B' : isLast ? hcColors.primary : '#9ED9BC';
          return (
            <Box
              key={day.date}
              sx={{
                flex: 1,
                minWidth: 0,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 1,
              }}
            >
              {isPeak && (
                <Box
                  sx={{
                    whiteSpace: 'nowrap',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#FFFFFF',
                    bgcolor: hcColors.onSurface,
                    px: 1,
                    py: 0.5,
                    borderRadius: 2,
                  }}
                >
                  {formatRub(day.total)}
                </Box>
              )}
              <Box
                title={formatRub(day.total)}
                sx={{
                  width: '100%',
                  maxWidth: 28,
                  height: Math.max(10, Math.round((day.total / max) * CHART_HEIGHT)),
                  bgcolor: color,
                  borderRadius: 3.5,
                }}
              />
              <Box sx={{ fontSize: 12, color: 'text.secondary', height: 16 }}>
                {dayOfMonth(day.date)}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
