import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded';
import SyncRounded from '@mui/icons-material/SyncRounded';
import { HC_MAIL_PROVIDERS, plural, type MailAccount } from '@how-much/shared';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { formatRelativeTime } from '../../lib/dates';
import { hcColors } from '../../theme/hcTheme';
import { ProviderAvatar } from './ProviderAvatar';

interface MailAccountCardProps {
  account: MailAccount;
  syncing: boolean;
  onSync: () => void;
  onDelete: () => void;
  deleting: boolean;
}

function StatusChip({ account, syncing }: { account: MailAccount; syncing: boolean }) {
  if (account.status === 'auth_failed') {
    return (
      <Chip
        icon={<ErrorOutlineRounded />}
        label="Ошибка входа"
        sx={{ bgcolor: '#FFDAD6', color: '#690005', '& .MuiChip-icon': { color: '#BA1A1A' } }}
      />
    );
  }
  if (syncing) {
    return (
      <Chip
        icon={<CircularProgress size={14} thickness={6} />}
        label={account.lastSyncAt ? 'Проверяем почту…' : 'Ищем чеки…'}
        sx={{ bgcolor: hcColors.secondaryContainer, color: hcColors.onSecondaryContainer }}
      />
    );
  }
  if (account.status === 'disabled') return <Chip label="Отключён" />;
  return (
    <Chip
      label="Подключён"
      sx={{ bgcolor: hcColors.primaryContainer, color: hcColors.onPrimaryContainer }}
    />
  );
}

function syncSummary(account: MailAccount): string {
  if (!account.lastSyncAt) {
    return account.status === 'auth_failed'
      ? 'Письма ещё не загружались'
      : 'Первая проверка может занять пару минут';
  }
  const found = account.emailsFound;
  return `Проверено ${formatRelativeTime(account.lastSyncAt)} · ${found} ${plural(found, [
    'письмо',
    'письма',
    'писем',
  ])} с чеками`;
}

export function MailAccountCard({
  account,
  syncing,
  onSync,
  onDelete,
  deleting,
}: MailAccountCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const provider = HC_MAIL_PROVIDERS[account.provider];

  return (
    <Box
      component="article"
      sx={{
        bgcolor: 'background.paper',
        borderRadius: 6,
        p: { xs: 2, sm: 2.5 },
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <ProviderAvatar provider={account.provider} />
        <Box sx={{ minWidth: 0, flex: '1 1 180px' }}>
          <Typography
            sx={{ fontWeight: 600, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {account.login}
          </Typography>
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
            {provider.name} · {syncSummary(account)}
          </Typography>
        </Box>
        <StatusChip account={account} syncing={syncing} />
        <Box sx={{ display: 'flex', gap: 0.5, ml: { xs: 'auto', sm: 0 } }}>
          <Button startIcon={<SyncRounded />} onClick={onSync} disabled={syncing}>
            Обновить
          </Button>
          <Tooltip title="Отключить ящик">
            <IconButton aria-label="Отключить ящик" onClick={() => setConfirmOpen(true)}>
              <DeleteOutlineRounded />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {account.status === 'auth_failed' && (
        <Typography sx={{ fontSize: 14, color: '#690005' }}>
          Почта перестала принимать пароль приложения — возможно, его удалили. Отключите ящик и
          подключите заново с новым паролем.
        </Typography>
      )}

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        slotProps={{ paper: { sx: { borderRadius: 7 } } }}
      >
        <DialogTitle>Отключить {account.login}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Новые чеки из этого ящика перестанут приходить. Уже загруженные покупки останутся.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setConfirmOpen(false)}>Отмена</Button>
          <Button
            variant="contained"
            color="error"
            loading={deleting}
            onClick={() => {
              onDelete();
              setConfirmOpen(false);
            }}
          >
            Отключить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
