import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useCurrentUser } from './useCurrentUser';

/** Пускает дальше только вошедших. Гостя отправляет на вход и запоминает, куда он шёл. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const user = useCurrentUser();
  const location = useLocation();

  if (user.isPending) {
    return (
      <Box
        sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <CircularProgress aria-label="Загрузка" />
      </Box>
    );
  }

  if (!user.data) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
