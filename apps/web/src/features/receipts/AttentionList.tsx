import MarkEmailUnreadRounded from '@mui/icons-material/MarkEmailUnreadRounded';
import ReplayRounded from '@mui/icons-material/ReplayRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { hcApi } from '../../api/hcApi';
import { formatPurchaseTime } from '../../lib/dates';
import { hcColors } from '../../theme/hcTheme';

export const ATTENTION_KEY = ['receipts', 'attention'];

/** Письма, которые не удалось разобрать: причина и два действия — повторить или скрыть. */
export function AttentionList() {
  const queryClient = useQueryClient();
  const emails = useQuery({ queryKey: ATTENTION_KEY, queryFn: hcApi.getAttentionEmails });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['receipts'] });
  const retry = useMutation({ mutationFn: hcApi.retryAttentionEmail, onSuccess: refresh });
  const dismiss = useMutation({ mutationFn: hcApi.dismissAttentionEmail, onSuccess: refresh });

  if (emails.isPending) return <Skeleton variant="rounded" height={120} sx={{ borderRadius: 4 }} />;
  if (emails.isError) {
    return (
      <Alert severity="error" sx={{ borderRadius: 3 }}>
        Не удалось загрузить письма.
      </Alert>
    );
  }
  if (emails.data.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
        Все письма разобраны — проверять нечего.
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {emails.data.map((email) => (
        <Box
          key={email.id}
          component="article"
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 4,
            p: 2.5,
            display: 'flex',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              flex: 'none',
              borderRadius: '50%',
              bgcolor: hcColors.tertiaryContainer,
              color: hcColors.tertiary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MarkEmailUnreadRounded />
          </Box>
          <Box sx={{ flex: '1 1 240px', minWidth: 0 }}>
            <Typography sx={{ fontWeight: 600 }}>{email.subject}</Typography>
            <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
              {email.from} · {formatPurchaseTime(email.receivedAt)}
            </Typography>
            <Typography sx={{ fontSize: 14, color: hcColors.tertiaryStrong, mt: 0.5 }}>
              {email.reason}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', ml: 'auto' }}>
            <Button
              startIcon={<ReplayRounded />}
              loading={retry.isPending && retry.variables === email.id}
              onClick={() => retry.mutate(email.id)}
            >
              Разобрать заново
            </Button>
            <Button
              color="inherit"
              loading={dismiss.isPending && dismiss.variables === email.id}
              onClick={() => dismiss.mutate(email.id)}
            >
              Это не чек
            </Button>
          </Box>
        </Box>
      ))}
    </Box>
  );
}
