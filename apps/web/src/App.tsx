import { Route, Routes } from 'react-router';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { AppShell } from './layout/AppShell';
import { ComingSoonPage } from './pages/ComingSoonPage';

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route index element={<DashboardPage />} />
        <Route path="receipts/*" element={<ComingSoonPage title="Чеки" />} />
        <Route path="inflation" element={<ComingSoonPage title="Личная инфляция" />} />
        <Route path="ask" element={<ComingSoonPage title="Вопросы" />} />
        <Route path="settings" element={<ComingSoonPage title="Настройки" />} />
        <Route path="*" element={<ComingSoonPage title="Такой страницы нет" />} />
      </Routes>
    </AppShell>
  );
}
