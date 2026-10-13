import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { can } from '@how-much/shared';
import { hcApi } from '../../api/hcApi';
import { PageHeader } from '../../layout/PageHeader';
import { periodLabels, readPeriodQuery, writePeriodQuery } from '../../lib/periods';
import { useCurrentUser } from '../auth/useCurrentUser';
import { CategoryGrid } from './CategoryGrid';
import { DailySpendingCard } from './DailySpendingCard';
import { EmptyDashboard } from './EmptyDashboard';
import { HeroCard } from './HeroCard';
import { InsightCard } from './InsightCard';
import { PeriodPicker } from './PeriodPicker';
import { RecentPurchases } from './RecentPurchases';
import { StatCards } from './StatCards';
import { TopMerchantsCard } from './TopMerchantsCard';

/** Скелетон повторяет раскладку дашборда, чтобы при загрузке ничего не прыгало. */
function DashboardSkeleton() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 } }} aria-busy>
      <Skeleton variant="rounded" height={220} sx={{ borderRadius: 4 }} />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 2,
        }}
      >
        <Skeleton variant="rounded" height={96} sx={{ borderRadius: 4 }} />
        <Skeleton variant="rounded" height={96} sx={{ borderRadius: 4 }} />
      </Box>
      <Skeleton variant="text" width={200} height={36} />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' },
          gap: 1.5,
        }}
      >
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} variant="rounded" height={150} sx={{ borderRadius: 4 }} />
        ))}
      </Box>
      <Skeleton variant="rounded" height={300} sx={{ borderRadius: 4 }} />
    </Box>
  );
}

/** Чеки есть, но не в этом периоде — не путаем с новичком, которому нужно подключить почту. */
function EmptyPeriod({ onShowMonth }: { onShowMonth?: () => void }) {
  return (
    <Box
      component="section"
      sx={{
        bgcolor: '#FFFFFF',
        borderRadius: 4,
        px: 3,
        py: 5,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 1.5,
      }}
    >
      <Typography variant="h2">За этот период трат нет</Typography>
      <Typography color="text.secondary">
        Выберите другой период или добавьте трату наличными.
      </Typography>
      {onShowMonth && (
        <Button variant="outlined" onClick={onShowMonth}>
          Показать месяц
        </Button>
      )}
    </Box>
  );
}

export function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: user } = useCurrentUser();
  const locked = !user || !can(user, 'dashboardPeriods');
  // Ссылка с ?period=week у пользователя на Free открывает месяц, а не ошибку 402.
  const query = locked ? ({ period: 'month' } as const) : readPeriodQuery(searchParams);
  const summary = useQuery({
    queryKey: ['dashboard-summary', query],
    queryFn: () => hcApi.getDashboardSummary(query),
    // При смене периода оставляем старые цифры, пока грузятся новые, — без мигания скелетона.
    placeholderData: keepPreviousData,
  });
  const data = summary.data;
  const showMonth = () => setSearchParams(writePeriodQuery({ period: 'month' }), { replace: true });

  return (
    <>
      <PageHeader title="Привет!" />
      <PeriodPicker
        value={query}
        locked={locked}
        onChange={(next) => setSearchParams(writePeriodQuery(next), { replace: true })}
      />

      {summary.isPending && <DashboardSkeleton />}

      {summary.isError && (
        <Alert
          severity="error"
          action={<Button onClick={() => summary.refetch()}>Повторить</Button>}
          sx={{ borderRadius: 3 }}
        >
          Не удалось загрузить данные. Проверьте соединение и попробуйте ещё раз.
        </Alert>
      )}

      {data && (
        <Box
          // Новый период — заново проигрываем появление блоков.
          key={JSON.stringify(data.period)}
          className="hc-stagger"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: { xs: 2, md: 3 },
            opacity: summary.isPlaceholderData ? 0.55 : 1,
            transition: 'opacity 200ms',
          }}
        >
          {!data.hasReceipts && <EmptyDashboard />}
          {data.hasReceipts && data.receiptsCount === 0 && (
            <EmptyPeriod onShowMonth={query.period === 'month' ? undefined : showMonth} />
          )}
          {data.receiptsCount > 0 && (
            <>
              <HeroCard
                total={data.total}
                previousTotal={data.previousTotal}
                labels={periodLabels(data)}
              />
              <StatCards {...data} labels={periodLabels(data)} />
              <CategoryGrid byCategory={data.byCategory} total={data.total} />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <DailySpendingCard byDay={data.byDay} />
                <TopMerchantsCard topMerchants={data.topMerchants} />
                <InsightCard byCategory={data.byCategory} labels={periodLabels(data)} />
              </Box>
              <RecentPurchases recent={data.recent} />
            </>
          )}
        </Box>
      )}
    </>
  );
}
