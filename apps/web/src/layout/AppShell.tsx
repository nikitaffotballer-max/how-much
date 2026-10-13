import AddRounded from '@mui/icons-material/AddRounded';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import ChatBubbleOutlineRounded from '@mui/icons-material/ChatBubbleOutlineRounded';
import DashboardRounded from '@mui/icons-material/DashboardRounded';
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded';
import SettingsRounded from '@mui/icons-material/SettingsRounded';
import TrendingUpRounded from '@mui/icons-material/TrendingUpRounded';
import type { SvgIconComponent } from '@mui/icons-material';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { plural } from '@how-much/shared';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import { HCLogo } from '../components/HCLogo';
import { daysLeft, useCurrentUser } from '../features/auth/useCurrentUser';
import { hcColors } from '../theme/hcTheme';

interface NavItem {
  to: string;
  label: string;
  icon: SvgIconComponent;
  badge?: string;
  pro?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Дашборд', icon: DashboardRounded },
  { to: '/receipts', label: 'Чеки', icon: ReceiptLongRounded },
  { to: '/inflation', label: 'Инфляция', icon: TrendingUpRounded, pro: true },
  { to: '/ask', label: 'Вопросы', icon: ChatBubbleOutlineRounded, pro: true },
  { to: '/settings', label: 'Настройки', icon: SettingsRounded },
];

function NavItemLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <Box
      component={NavLink}
      to={item.to}
      end
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.75,
        minHeight: 56,
        pl: 2,
        pr: 2.5,
        borderRadius: 7,
        color: hcColors.onSurfaceVariant,
        textDecoration: 'none',
        fontWeight: 500,
        fontSize: 15,
        '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' },
        '&.active': {
          bgcolor: hcColors.secondaryContainer,
          color: hcColors.onSecondaryContainer,
          fontWeight: 600,
        },
      }}
    >
      <Icon />
      {item.label}
      {item.badge && (
        <Box
          component="span"
          sx={{
            ml: 'auto',
            minWidth: 20,
            height: 20,
            px: 0.75,
            borderRadius: 2.5,
            bgcolor: hcColors.tertiary,
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {item.badge}
        </Box>
      )}
      {item.pro && (
        <Box
          component="span"
          sx={{
            ml: 'auto',
            fontSize: 11,
            fontWeight: 700,
            color: hcColors.insightAccent,
            bgcolor: hcColors.insightContainer,
            px: 1,
            py: 0.375,
            borderRadius: 2,
          }}
        >
          PRO
        </Box>
      )}
    </Box>
  );
}

/** Карточка пробного периода. Показываем только тем, у кого он идёт. */
function ProTrialCard() {
  const { data: user } = useCurrentUser();
  if (user?.subscriptionStatus !== 'trialing') return null;
  const days = daysLeft(user.periodEndsAt) ?? 0;

  return (
    <Box
      sx={{
        mt: 'auto',
        p: 2.5,
        borderRadius: 6,
        bgcolor: hcColors.tertiaryContainer,
        color: hcColors.onTertiaryContainer,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700, fontSize: 15 }}>
        <AutoAwesomeRounded sx={{ fontSize: 20, color: hcColors.tertiary }} />
        Pro · пробный период
      </Box>
      <Box sx={{ fontSize: 14, lineHeight: 1.45 }}>
        {plural(days, ['Остался', 'Осталось', 'Осталось'])} {days}{' '}
        {plural(days, ['день', 'дня', 'дней'])}, затем 249 ₽ в месяц.
      </Box>
      <Button
        component={NavLink}
        to="/settings"
        sx={{ alignSelf: 'flex-start', bgcolor: '#FFFFFF', color: '#7A2E00' }}
      >
        Оформить
      </Button>
    </Box>
  );
}

/** Боковое меню + область контента. На узком экране меню уходит наверх (flex-wrap). */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', minHeight: '100vh' }}>
      <Box
        component="nav"
        aria-label="Основное меню"
        sx={{
          flex: '1 1 240px',
          px: 1.5,
          py: 2.5,
          bgcolor: hcColors.surfaceContainer,
          display: 'flex',
          flexDirection: 'column',
          gap: 2.5,
        }}
      >
        <Box sx={{ px: 2, pt: 0.5 }}>
          <HCLogo />
        </Box>
        <Button
          startIcon={<AddRounded />}
          sx={{
            alignSelf: 'flex-start',
            ml: 0.5,
            minHeight: 56,
            borderRadius: 4,
            bgcolor: hcColors.primaryContainer,
            color: hcColors.onPrimaryContainer,
            boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06)',
            '&:hover': { bgcolor: '#A3E8C5' },
          }}
        >
          Добавить наличные
        </Button>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
          {NAV_ITEMS.map((item) => (
            <NavItemLink key={item.to} item={item} />
          ))}
        </Box>
        <ProTrialCard />
      </Box>
      <Box
        component="main"
        sx={{
          flex: '999 1 600px',
          minWidth: 0,
          px: { xs: 2, md: 4 },
          pt: 2.5,
          pb: 6,
          display: 'flex',
          flexDirection: 'column',
          gap: 2.5,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
