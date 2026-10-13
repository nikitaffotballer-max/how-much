import { changePasswordSchema } from '@how-much/shared';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { hcApi } from '../../api/hcApi';
import { ServerError } from '../../components/ServerError';
import { hcColors } from '../../theme/hcTheme';
import { useCurrentUser } from '../auth/useCurrentUser';
import { SettingsSection } from './SettingsSection';

const sinceFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function ChangePasswordDialog({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const change = useMutation({ mutationFn: hcApi.changePassword, onSuccess: onDone });

  const parsed = changePasswordSchema.safeParse({ currentPassword, newPassword });
  const fieldError = (field: 'currentPassword' | 'newPassword') =>
    submitted && !parsed.success
      ? parsed.error.issues.find((issue) => issue.path[0] === field)?.message
      : undefined;

  function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (parsed.success) change.mutate(parsed.data);
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
        <DialogTitle>Новый пароль</DialogTitle>
        <DialogContent
          sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}
        >
          <TextField
            label="Текущий пароль"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            error={Boolean(fieldError('currentPassword'))}
            helperText={fieldError('currentPassword')}
          />
          <TextField
            label="Новый пароль"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            error={Boolean(fieldError('newPassword'))}
            helperText={fieldError('newPassword') ?? 'Не короче 8 символов'}
          />
          <ServerError error={change.error} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose}>Отмена</Button>
          <Button type="submit" variant="contained" loading={change.isPending}>
            Сменить
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

/** Профиль: кто вошёл, с какого дня с нами, смена пароля. */
export function ProfileSection() {
  const { data: user } = useCurrentUser();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [changed, setChanged] = useState(false);
  if (!user) return null;

  return (
    <SettingsSection id="profile-title" title="Профиль">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Avatar
          sx={{
            width: 48,
            height: 48,
            bgcolor: hcColors.primaryContainer,
            color: hcColors.primary,
          }}
        >
          {user.email.charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
          <Typography noWrap sx={{ fontWeight: 600 }}>
            {user.email}
          </Typography>
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
            С нами с {sinceFormatter.format(new Date(user.createdAt))}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          onClick={() => {
            setChanged(false);
            setDialogOpen(true);
          }}
        >
          Сменить пароль
        </Button>
      </Box>
      {changed && (
        <Alert severity="success" sx={{ borderRadius: 3 }} onClose={() => setChanged(false)}>
          Пароль изменён. На других устройствах нужно будет войти заново.
        </Alert>
      )}
      {/* key сбрасывает поля и ошибки при каждом открытии. */}
      <ChangePasswordDialog
        key={String(dialogOpen)}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onDone={() => {
          setDialogOpen(false);
          setChanged(true);
        }}
      />
    </SettingsSection>
  );
}
