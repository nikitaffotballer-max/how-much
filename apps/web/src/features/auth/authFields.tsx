import VisibilityOffRounded from '@mui/icons-material/VisibilityOffRounded';
import VisibilityRounded from '@mui/icons-material/VisibilityRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation } from '@tanstack/react-query';
import { useState, type Ref } from 'react';
import { hcApi, HCApiError } from '../../api/hcApi';
import { useFinishSignIn } from './useFinishSignIn';

/** Скругление полей — как у остальных элементов в стиле Material 3. */
const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 3 } };

/** В React 19 ref — обычный проп; react-hook-form передаёт его через register(). */
type FieldProps = TextFieldProps & { ref?: Ref<HTMLInputElement> };

export function EmailField({ ref, ...props }: FieldProps) {
  return (
    <TextField
      {...props}
      inputRef={ref}
      label="Email"
      type="email"
      autoComplete="email"
      fullWidth
      sx={fieldSx}
    />
  );
}

export function PasswordField({ ref, ...props }: FieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      inputRef={ref}
      label="Пароль"
      type={visible ? 'text' : 'password'}
      fullWidth
      sx={fieldSx}
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
                onClick={() => setVisible((v) => !v)}
                edge="end"
              >
                {visible ? <VisibilityOffRounded /> : <VisibilityRounded />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}

export function FormHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <Typography variant="h1">{title}</Typography>
      <Typography color="text.secondary">{subtitle}</Typography>
    </Box>
  );
}

/** Понятный текст ошибки: сообщение от API или общее, если сервер недоступен. */
export function ServerError({ error }: { error: unknown }) {
  if (!error) return null;
  const message =
    error instanceof HCApiError
      ? error.message
      : 'Не удалось связаться с сервером. Попробуйте ещё раз.';
  return (
    <Alert severity="error" sx={{ borderRadius: 3 }}>
      {message}
    </Alert>
  );
}

/** «или» + кнопка входа в демо-аккаунт. */
export function DemoSignIn() {
  const finishSignIn = useFinishSignIn();
  const demo = useMutation({ mutationFn: hcApi.loginDemo, onSuccess: finishSignIn });

  return (
    <>
      <Divider sx={{ color: 'text.secondary', fontSize: 14 }}>или</Divider>
      <Button
        variant="outlined"
        size="large"
        loading={demo.isPending}
        onClick={() => demo.mutate()}
      >
        Посмотреть демо без регистрации
      </Button>
      <ServerError error={demo.error} />
    </>
  );
}
