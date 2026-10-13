import type { ReactNode } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { RequireAuth } from './features/auth/RequireAuth';
import { useCurrentUser } from './features/auth/useCurrentUser';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { ReceiptPage } from './features/receipts/ReceiptPage';
import { ReceiptsPage } from './features/receipts/ReceiptsPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { AppShell } from './layout/AppShell';

/** Вошедшему пользователю нечего делать на экранах входа — отправляем на дашборд. */
function GuestOnly({ children }: { children: ReactNode }) {
  const user = useCurrentUser();
  if (user.data) return <Navigate to="/" replace />;
  return children;
}

function PrivateLayout() {
  return (
    <RequireAuth>
      <AppShell>
        <Outlet />
      </AppShell>
    </RequireAuth>
  );
}

export function App() {
  return (
    <Routes>
      <Route
        path="login"
        element={
          <GuestOnly>
            <LoginPage />
          </GuestOnly>
        }
      />
      <Route
        path="register"
        element={
          <GuestOnly>
            <RegisterPage />
          </GuestOnly>
        }
      />
      <Route element={<PrivateLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="receipts" element={<ReceiptsPage />} />
        <Route path="receipts/:id" element={<ReceiptPage />} />
        <Route path="settings" element={<SettingsPage />} />
        {/* Разделов, которых ещё нет, не показываем: неизвестный адрес ведёт на дашборд. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
