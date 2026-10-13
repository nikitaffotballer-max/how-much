import { formatRub, type DashboardSummary } from '@how-much/shared';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { dayOfMonth } from '../../lib/dates';
import { hcColors } from '../../theme/hcTheme';

const CHART_HEIGHT = 160;
/** Больше подписей под столбиками не помещается на телефоне. */
const MAX_LABELS = 16;

const weekdayFormatter = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', timeZone: 'UTC' });

/** Неделю подписываем днями недели, длинные периоды — числом через равный шаг. */
function dayLabel(date: string, index: number, count: number): string {
  if (count <= 7) return weekdayFormatter.format(new Date(`${date}T00:00:00Z`));
  const step = Math.ceil(count / MAX_LABELS);
  return index % step === 0 ? String(dayOfMonth(date)) : '';
}

/** Столбики трат по дням. Самый дорогой день — оранжевый с подписью, последний — тёмно-зелёный. */
export function DailySpendingCard({ byDay }: Pick<DashboardSummary, 'byDay'>) {
  // За один день столбик ничего не показывает.
  if (byDay.length < 2) return null;
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
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: byDay.length > 31 ? 0.25 : 0.75,
          height: CHART_HEIGHT + 72,
        }}
      >
        {byDay.map((day, index) => {
          const isPeak = day === peak;
          const isLast = index === byDay.length - 1;
          const color = isPeak
            ? '#F08A4B'
            : day.total === 0
              ? hcColors.surfaceContainerHigh
              : isLast
                ? hcColors.primary
                : '#9ED9BC';
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
                className="hc-grow-y"
                title={formatRub(day.total)}
                sx={{
                  width: '100%',
                  maxWidth: 28,
                  // Пустой день — тонкая черта: видно, что день был, но не шумит.
                  height:
                    day.total === 0
                      ? 4
                      : Math.max(10, Math.round((day.total / max) * CHART_HEIGHT)),
                  bgcolor: color,
                  borderRadius: '6px 6px 2px 2px',
                }}
              />
              <Box sx={{ fontSize: 12, color: 'text.secondary', height: 16 }}>
                {dayLabel(day.date, index, byDay.length)}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
