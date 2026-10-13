import AddRounded from '@mui/icons-material/AddRounded';
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded';
import { HC_PLAN_LIMITS, type MailAccount } from '@how-much/shared';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { hcApi, HCApiError } from '../../api/hcApi';
import { hcColors } from '../../theme/hcTheme';
import { useCurrentUser } from '../auth/useCurrentUser';
import { ConnectMailCard } from './ConnectMailCard';
import { MailAccountCard } from './MailAccountCard';

const MAIL_ACCOUNTS_KEY = ['mail-accounts'];

/** Пока воркер забирает письма, раз в несколько секунд спрашиваем, не закончил ли он. */
const SYNC_POLL_MS = 4000;

/** Подсказка, без которой чеков в почте не будет: магазин должен их туда присылать. */
function ReceiptTip() {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        p: 2.5,
        borderRadius: 4,
        bgcolor: hcColors.tertiaryContainer,
        color: hcColors.onTertiaryContainer,
      }}
    >
      <ReceiptLongRounded sx={{ color: hcColors.tertiary, mt: 0.25 }} />
      <Box sx={{ fontSize: 15, lineHeight: 1.5 }}>
        <Box sx={{ fontWeight: 700, mb: 0.5 }}>Чтобы чеки приходили на почту</Box>
        Включите электронный чек в приложениях магазинов — Пятёрочки, Магнита, ВкусВилла — и укажите
        этот адрес. Интернет-магазины вроде Ozon присылают чеки сами. На кассе можно попросить
        отправить чек на email.
      </Box>
    </Box>
  );
}

export function MailAccountsSection() {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // Когда пользователь нажал «Обновить» — чтобы показывать «Проверяем…», пока воркер не ответит.
  const [syncRequestedAt, setSyncRequestedAt] = useState<Record<string, number>>({});

  const isSyncing = (account: MailAccount) =>
    account.status === 'active' &&
    (account.lastSyncAt === null ||
      Date.parse(account.lastSyncAt) < (syncRequestedAt[account.id] ?? 0));

  const accounts = useQuery({
    queryKey: MAIL_ACCOUNTS_KEY,
    queryFn: hcApi.getMailAccounts,
    refetchInterval: (query) => (query.state.data?.some(isSyncing) ? SYNC_POLL_MS : false),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: MAIL_ACCOUNTS_KEY });

  const sync = useMutation({
    mutationFn: hcApi.syncMailAccount,
    onMutate: (id) => setSyncRequestedAt((prev) => ({ ...prev, [id]: Date.now() })),
    onSuccess: refresh,
    onError: (error, id) => {
      setSyncRequestedAt(({ [id]: _, ...rest }) => rest);
      setNotice(
        error instanceof HCApiError && error.status === 429
          ? 'Обновлять ящик можно раз в минуту'
          : 'Не удалось запустить проверку почты',
      );
    },
  });

  const remove = useMutation({
    mutationFn: hcApi.deleteMailAccount,
    onSuccess: () => {
      setNotice('Ящик отключён');
      return refresh();
    },
    onError: () => setNotice('Не удалось отключить ящик'),
  });

  const list = accounts.data ?? [];
  const limit = user ? HC_PLAN_LIMITS[user.plan].mailAccounts : 1;
  const canAdd = list.length < limit;
  const showForm = accounts.isSuccess && (list.length === 0 || adding);

  return (
    <Box
      component="section"
      aria-labelledby="mail-accounts-title"
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minHeight: 40 }}>
        <Typography id="mail-accounts-title" variant="h2" sx={{ flex: 1 }}>
          Почтовые ящики
        </Typography>
        {list.length > 0 && canAdd && !adding && (
          <Button startIcon={<AddRounded />} onClick={() => setAdding(true)}>
            Добавить ящик
          </Button>
        )}
      </Box>

      {accounts.isPending && <Skeleton variant="rounded" height={88} sx={{ borderRadius: 4 }} />}

      {accounts.isError && (
        <Alert
          severity="error"
          action={<Button onClick={() => accounts.refetch()}>Повторить</Button>}
          sx={{ borderRadius: 3 }}
        >
          Не удалось загрузить почтовые ящики.
        </Alert>
      )}

      {list.map((account) => (
        <MailAccountCard
          key={account.id}
          account={account}
          syncing={isSyncing(account)}
          onSync={() => sync.mutate(account.id)}
          onDelete={() => remove.mutate(account.id)}
          deleting={remove.isPending && remove.variables === account.id}
        />
      ))}

      {list.length > 0 && !canAdd && user?.plan === 'free' && (
        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
          На тарифе Free — один ящик. В Pro можно подключить до пяти.
        </Typography>
      )}

      {showForm && (
        <ConnectMailCard
          onConnected={(account) => {
            setAdding(false);
            setNotice(`Ящик ${account.login} подключён — ищем в нём чеки`);
            void refresh();
          }}
          onCancel={list.length > 0 ? () => setAdding(false) : undefined}
        />
      )}

      <ReceiptTip />

      <Snackbar
        open={notice !== null}
        message={notice}
        autoHideDuration={4000}
        onClose={() => setNotice(null)}
      />
    </Box>
  );
}
