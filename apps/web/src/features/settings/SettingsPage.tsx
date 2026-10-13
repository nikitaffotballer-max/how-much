import { PageHeader } from '../../layout/PageHeader';
import { MailAccountsSection } from '../mail/MailAccountsSection';

/** Настройки (ТЗ, экран 12). Пока здесь только почта; подписка и профиль появятся следом. */
export function SettingsPage() {
  return (
    <>
      <PageHeader title="Настройки" subtitle="Откуда берутся чеки" />
      <MailAccountsSection />
    </>
  );
}
