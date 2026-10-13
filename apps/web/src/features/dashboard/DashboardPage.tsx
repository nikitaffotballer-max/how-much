import CheckRounded from '@mui/icons-material/CheckRounded';
import NotificationsNoneRounded from '@mui/icons-material/NotificationsNoneRounded';
import PersonRounded from '@mui/icons-material/PersonRounded';
import SearchRounded from '@mui/icons-material/SearchRounded';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { hcApi } from '../../api/hcApi';
import { hcColors } from '../../theme/hcTheme';
import { CategoryGrid } from './CategoryGrid';
import { DailySpendingCard } from './DailySpendingCard';
import { HeroCard } from './HeroCard';
import { InsightCard } from './InsightCard';
import { RecentPurchases } from './RecentPurchases';
import { StatCards } from './StatCards';

type Period = 'day' | 'week' | 'month' | 'custom';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'day', label: 'День' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'custom', label: 'Свой период' },
];

function TopBar() {
  return (
    <Box
      component="header"
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        minHeight: 64,
      }}
    >
      <Box>
        <Typography variant="h1">Привет!</Typography>
        <Typography sx={{ fontSize: 15, color: 'text.secondary' }}>
          Вот как идёт этот месяц
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: '0 1 520px', minWidth: 260 }}>
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            minHeight: 52,
            px: 2.5,
            borderRadius: 6.5,
            bgcolor: hcColors.surfaceContainerHigh,
            color: 'text.secondary',
          }}
        >
          <SearchRounded />
          <InputBase
            placeholder="Найти товар или магазин"
            inputProps={{ 'aria-label': 'Поиск по товарам и магазинам' }}
            sx={{ flex: 1, fontSize: 15 }}
          />
        </Box>
        <IconButton aria-label="Уведомления" size="large">
          <Badge variant="dot" color="secondary">
            <NotificationsNoneRounded />
          </Badge>
        </IconButton>
        <Avatar sx={{ bgcolor: hcColors.secondaryContainer, color: hcColors.onSecondaryContainer }}>
          <PersonRounded />
        </Avatar>
      </Box>
    </Box>
  );
}

function PeriodChips({ value, onChange }: { value: Period; onChange: (period: Period) => void }) {
  return (
    <Box role="group" aria-label="Период" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {PERIODS.map((period) => {
        const selected = period.value === value;
        return (
          <Chip
            key={period.value}
            label={period.label}
            icon={selected ? <CheckRounded /> : undefined}
            variant={selected ? 'filled' : 'outlined'}
            aria-pressed={selected}
            onClick={() => onChange(period.value)}
            sx={
              selected
                ? { bgcolor: hcColors.secondaryContainer, color: hcColors.onSecondaryContainer }
                : undefined
            }
          />
        );
      })}
    </Box>
  );
}

function DashboardSkeleton() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }} aria-busy>
      <Skeleton variant="rounded" height={220} sx={{ borderRadius: 7 }} />
      <Skeleton variant="rounded" height={96} sx={{ borderRadius: 6 }} />
      <Skeleton variant="rounded" height={320} sx={{ borderRadius: 7 }} />
    </Box>
  );
}

export function DashboardPage() {
  // Период пока влияет только на чипы: API с периодами появится вместе с базой.
  const [period, setPeriod] = useState<Period>('month');
  const summary = useQuery({
    queryKey: ['dashboard-summary', period],
    queryFn: hcApi.getDashboardSummary,
  });

  return (
    <>
      <TopBar />
      <PeriodChips value={period} onChange={setPeriod} />

      {summary.isPending && <DashboardSkeleton />}

      {summary.isError && (
        <Alert
          severity="error"
          action={<Button onClick={() => summary.refetch()}>Повторить</Button>}
          sx={{ borderRadius: 4 }}
        >
          Не удалось загрузить данные. Проверьте, что API запущен (pnpm dev).
        </Alert>
      )}

      {summary.data && (
        <>
          <HeroCard total={summary.data.total} previousTotal={summary.data.previousTotal} />
          <StatCards {...summary.data} />
          <CategoryGrid byCategory={summary.data.byCategory} total={summary.data.total} />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <DailySpendingCard byDay={summary.data.byDay} />
            <InsightCard />
          </Box>
          <RecentPurchases recent={summary.data.recent} />
        </>
      )}
    </>
  );
}
