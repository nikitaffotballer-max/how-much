import { formatRub, type DashboardSummary } from '@how-much/shared';
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded';
import SavingsRounded from '@mui/icons-material/SavingsRounded';
import Box from '@mui/material/Box';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { hcColors } from '../../theme/hcTheme';

interface StatCardProps {
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  hint: ReactNode;
  /** Куда ведёт карточка. */
  to: string;
}

function StatCard({ icon, iconBg, iconColor, label, value, hint, to }: StatCardProps) {
  return (
    <Box
      component={Link}
      to={to}
      sx={{
        bgcolor: '#FFFFFF',
        color: 'text.primary',
        textDecoration: 'none',
        borderRadius: 6,
        p: 2.5,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          bgcolor: iconBg,
          color: iconColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 'none',
        }}
      >
        {icon}
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        <Box sx={{ fontSize: 14, color: 'text.secondary' }}>{label}</Box>
        <Box sx={{ fontSize: 26, fontWeight: 700 }}>{value}</Box>
        <Box sx={{ fontSize: 13 }}>{hint}</Box>
      </Box>
    </Box>
  );
}

type StatCardsProps = Pick<
  DashboardSummary,
  'receiptsCount' | 'needsAttentionCount' | 'averageReceipt' | 'previousAverageReceipt'
>;

export function StatCards(props: StatCardsProps) {
  return (
    <Box
      component="section"
      aria-label="Показатели"
      sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 2 }}
    >
      <StatCard
        to={props.needsAttentionCount > 0 ? '/receipts?tab=attention' : '/receipts'}
        icon={<ReceiptLongRounded />}
        iconBg="#DCE6FF"
        iconColor="#1F4FA8"
        label="Чеков"
        value={String(props.receiptsCount)}
        hint={
          props.needsAttentionCount > 0 ? (
            <Box component="span" sx={{ color: hcColors.tertiaryStrong, fontWeight: 600 }}>
              {props.needsAttentionCount} ждут проверки →
            </Box>
          ) : (
            'все разобраны'
          )
        }
      />
      <StatCard
        to="/receipts"
        icon={<SavingsRounded />}
        iconBg="#FBEFC4"
        iconColor="#7D5F00"
        label="Средний чек"
        value={formatRub(props.averageReceipt)}
        hint={
          <Box component="span" sx={{ color: 'text.secondary' }}>
            в прошлом месяце {formatRub(props.previousAverageReceipt)}
          </Box>
        }
      />
    </Box>
  );
}
