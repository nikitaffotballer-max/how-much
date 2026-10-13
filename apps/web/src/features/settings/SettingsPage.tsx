import Box from '@mui/material/Box';
import { PageHeader } from '../../layout/PageHeader';
import { MailAccountsSection } from '../mail/MailAccountsSection';
import { DeleteAccountSection } from './DeleteAccountSection';
import { ProfileSection } from './ProfileSection';
import { SubscriptionSection } from './SubscriptionSection';

/** Настройки (ТЗ, экран 12): почта, профиль, подписка, удаление аккаунта. */
export function SettingsPage() {
  return (
    <>
      <PageHeader title="Настройки" />
      <Box className="hc-stagger" sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <MailAccountsSection />
        <ProfileSection />
        <SubscriptionSection />
        <DeleteAccountSection />
      </Box>
    </>
  );
}
