import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import DashboardRounded from '@mui/icons-material/DashboardRounded';
import SettingsRounded from '@mui/icons-material/SettingsRounded';
import type { SvgIconComponent } from '@mui/icons-material';
import Box from '@mui/material/Box';
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
}

/** Только готовые разделы: новые пункты появляются вместе с экранами. */
const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Дашборд', icon: DashboardRounded },
  { to: '/settings', label: 'Настройки', icon: SettingsRounded },
];

/** Пункт бокового меню (navigation drawer) на широком экране. */
function DrawerLink({ item }: { item: NavItem }) {
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
    </Box>
  );
}

/** Пункт нижней панели (navigation bar) на телефоне: иконка в «таблетке» и подпись. */
function BarLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <Box
      component={NavLink}
      to={item.to}
      end
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
        py: 1.5,
        color: hcColors.onSurfaceVariant,
        textDecoration: 'none',
        fontSize: 12,
        fontWeight: 500,
        '& .indicator': {
          width: 64,
          height: 32,
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
        '&.active': { color: hcColors.onSecondaryContainer, fontWeight: 700 },
        '&.active .indicator': { bgcolor: hcColors.secondaryContainer },
      }}
    >
      <span className="indicator">
        <Icon />
      </span>
      {item.label}
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
        {plural(days, ['день', 'дня', 'дней'])} бесплатного Pro.
      </Box>
    </Box>
  );
}

/**
 * Каркас приложения по Material 3: на широком экране — боковое меню,
 * на телефоне — нижняя панель, чтобы меню не занимало первый экран.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Box
        component="nav"
        aria-label="Основное меню"
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          gap: 2.5,
          width: 260,
          flex: 'none',
          px: 1.5,
          py: 2.5,
          bgcolor: hcColors.surfaceContainer,
        }}
      >
        <Box sx={{ px: 2, pt: 0.5, pb: 1 }}>
          <HCLogo />
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
          {NAV_ITEMS.map((item) => (
            <DrawerLink key={item.to} item={item} />
          ))}
        </Box>
        <ProTrialCard />
      </Box>

      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          px: { xs: 2, md: 4 },
          pt: 2.5,
          // Снизу на телефоне — место под нижнюю панель.
          pb: { xs: 13, md: 6 },
          display: 'flex',
          flexDirection: 'column',
          gap: 2.5,
        }}
      >
        {children}
      </Box>

      <Box
        component="nav"
        aria-label="Основное меню"
        sx={{
          display: { xs: 'flex', md: 'none' },
          position: 'fixed',
          insetInline: 0,
          bottom: 0,
          zIndex: 'appBar',
          bgcolor: hcColors.surfaceContainer,
          pb: 'env(safe-area-inset-bottom)',
        }}
      >
        {NAV_ITEMS.map((item) => (
          <BarLink key={item.to} item={item} />
        ))}
      </Box>
    </Box>
  );
}
