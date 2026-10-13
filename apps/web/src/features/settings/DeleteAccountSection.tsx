import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { hcApi } from '../../api/hcApi';
import { ServerError } from '../../components/ServerError';
import { CURRENT_USER_KEY } from '../auth/useCurrentUser';
import { SettingsSection } from './SettingsSection';

function DeleteAccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const remove = useMutation({
    mutationFn: hcApi.deleteAccount,
    onSuccess: () => {
      // Как при выходе: ничего от удалённого аккаунта не должно остаться в кэше.
      queryClient.clear();
      queryClient.setQueryData(CURRENT_USER_KEY, null);
      navigate('/login', { replace: true });
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (password) remove.mutate({ password });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      slotProps={{ paper: { sx: { borderRadius: 4 } } }}
    >
      <Box component="form" noValidate onSubmit={submit}>
        <DialogTitle>Удалить аккаунт?</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <DialogContentText>
            Удалим все чеки, подключённые ящики и сохранённые письма. Восстановить их будет нельзя.
            Письма в самой почте останутся.
          </DialogContentText>
          <TextField
            label="Пароль"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            helperText="Для подтверждения"
          />
          <ServerError error={remove.error} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose}>Отмена</Button>
          <Button
            type="submit"
            variant="contained"
            color="error"
            disabled={!password}
            loading={remove.isPending}
          >
            Удалить навсегда
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

/** Удаление аккаунта (ТЗ, раздел 9: полное удаление данных по запросу). */
export function DeleteAccountSection() {
  const [open, setOpen] = useState(false);

  return (
    <SettingsSection id="account-title" title="Аккаунт">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Typography sx={{ flex: '1 1 260px', fontSize: 14, color: 'text.secondary' }}>
          Удаление стирает все ваши данные в «Хау мач». Письма в почте не трогаем.
        </Typography>
        <Button color="error" variant="outlined" onClick={() => setOpen(true)}>
          Удалить аккаунт
        </Button>
      </Box>
      <DeleteAccountDialog key={String(open)} open={open} onClose={() => setOpen(false)} />
    </SettingsSection>
  );
}
