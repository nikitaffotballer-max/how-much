import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { hcColors } from '../../theme/hcTheme';
import { LandingPage } from '../landing/LandingPage';
import { useCurrentUser } from './useCurrentUser';

/** Пока проверяем сессию — контур приложения, чтобы после загрузки ничего не прыгало. */
function ShellSkeleton() {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }} aria-busy aria-label="Загрузка">
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          gap: 1.5,
          width: 260,
          flex: 'none',
          px: 3,
          py: 3,
          bgcolor: hcColors.surfaceContainer,
        }}
      >
        <Skeleton variant="rounded" width={120} height={32} sx={{ borderRadius: 2, mb: 2 }} />
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} variant="rounded" height={44} sx={{ borderRadius: 3 }} />
        ))}
      </Box>
      <Box
        sx={{
          flex: 1,
          px: { xs: 2, md: 4 },
          pt: 3,
          display: 'grid',
          gap: 2.5,
          alignContent: 'start',
        }}
      >
        <Skeleton variant="text" width={180} height={44} />
        <Skeleton variant="rounded" height={220} sx={{ borderRadius: 4 }} />
        <Skeleton variant="rounded" height={96} sx={{ borderRadius: 4 }} />
      </Box>
    </Box>
  );
}

/** Пускает дальше только вошедших. Гостя отправляет на вход и запоминает, куда он шёл; на главной показывает лендинг. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const user = useCurrentUser();
  const location = useLocation();

  if (user.isPending) return <ShellSkeleton />;

  if (!user.data) {
    // Гость на главной видит лендинг, на остальных адресах — вход.
    if (location.pathname === '/') return <LandingPage />;
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
