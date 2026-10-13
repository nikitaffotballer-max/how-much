import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { hcApi } from '../../api/hcApi';
import { UserMenu } from '../../layout/UserMenu';
import { CategoryGrid } from './CategoryGrid';
import { DailySpendingCard } from './DailySpendingCard';
import { EmptyDashboard } from './EmptyDashboard';
import { HeroCard } from './HeroCard';
import { InsightCard } from './InsightCard';
import { RecentPurchases } from './RecentPurchases';
import { StatCards } from './StatCards';

const monthFormatter = new Intl.DateTimeFormat('ru-RU', { month: 'long' });

function TopBar() {
  const month = monthFormatter.format(new Date());
  return (
    <Box
      component="header"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        minHeight: 64,
      }}
    >
      <Box>
        <Typography variant="h1">Привет!</Typography>
        <Typography sx={{ fontSize: 15, color: 'text.secondary' }}>Вот как идёт {month}</Typography>
      </Box>
      <UserMenu />
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
  const summary = useQuery({ queryKey: ['dashboard-summary'], queryFn: hcApi.getDashboardSummary });
  const data = summary.data;

  return (
    <>
      <TopBar />

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

      {data && data.receiptsCount === 0 && <EmptyDashboard />}

      {data && data.receiptsCount > 0 && (
        <>
          <HeroCard total={data.total} previousTotal={data.previousTotal} />
          <StatCards {...data} />
          <CategoryGrid byCategory={data.byCategory} total={data.total} />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <DailySpendingCard byDay={data.byDay} />
            <InsightCard byCategory={data.byCategory} />
          </Box>
          <RecentPurchases recent={data.recent} />
        </>
      )}
    </>
  );
}
