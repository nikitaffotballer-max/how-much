import type { DashboardSummary } from '@how-much/shared';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { Link } from 'react-router';
import { formatPurchaseTime } from '../../lib/dates';
import { ReceiptRow } from '../receipts/ReceiptRow';

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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h2" id="recent-title">
          Последние покупки
        </Typography>
        <Button component={Link} to="/receipts">
          Все чеки
        </Button>
      </Box>
      {recent.map((receipt) => (
        <ReceiptRow
          key={receipt.id}
          receipt={receipt}
          caption={formatPurchaseTime(receipt.purchasedAt)}
        />
      ))}
    </Box>
  );
}
