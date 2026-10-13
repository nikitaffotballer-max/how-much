import { formatRub, type DashboardSummary } from '@how-much/shared';
import PaymentsRounded from '@mui/icons-material/PaymentsRounded';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { CategoryIcon } from '../../components/CategoryIcon';
import { formatPurchaseTime } from '../../lib/dates';
import { hcColors } from '../../theme/hcTheme';

type Purchase = DashboardSummary['recent'][number];

/** Наличные показываем иконкой купюры, а не категорией: так сразу видно, что чека нет. */
function PurchaseIcon({ purchase }: { purchase: Purchase }) {
  if (purchase.source !== 'cash') return <CategoryIcon category={purchase.category} size={48} />;
  return (
    <Box
      sx={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        bgcolor: '#E2F3E8',
        color: hcColors.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 'none',
      }}
    >
      <PaymentsRounded />
    </Box>
  );
}

export function RecentPurchases({ recent }: Pick<DashboardSummary, 'recent'>) {
  return (
    <Box
      component="section"
      aria-labelledby="recent-title"
      sx={{
        bgcolor: '#FFFFFF',
        borderRadius: 7,
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
      }}
    >
      <Typography variant="h2" id="recent-title" sx={{ pb: 1 }}>
        Последние покупки
      </Typography>
      {recent.map((purchase) => (
        <Box
          key={purchase.id}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            minHeight: 72,
            px: 1.5,
            borderRadius: 5,
          }}
        >
          <PurchaseIcon purchase={purchase} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ fontSize: 16, fontWeight: 600 }}>{purchase.merchant}</Box>
            <Box
              sx={{
                fontSize: 14,
                color: 'text.secondary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {formatPurchaseTime(purchase.purchasedAt)} · {purchase.itemsPreview}
            </Box>
          </Box>
          <Box sx={{ fontSize: 17, fontWeight: 700, whiteSpace: 'nowrap' }}>
            {formatRub(purchase.total)}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
