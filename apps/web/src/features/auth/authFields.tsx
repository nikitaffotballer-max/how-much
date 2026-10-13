import VisibilityOffRounded from '@mui/icons-material/VisibilityOffRounded';
import VisibilityRounded from '@mui/icons-material/VisibilityRounded';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState, type Ref } from 'react';

/** Скругление полей — как у остальных элементов в стиле Material 3. */
const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 3 } };

/** В React 19 ref — обычный проп; react-hook-form передаёт его через register(). */
type FieldProps = TextFieldProps & { ref?: Ref<HTMLInputElement> };

export function EmailField({ ref, ...props }: FieldProps) {
  return (
    <TextField
      label="Email"
      {...props}
      inputRef={ref}
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
      label="Пароль"
      {...props}
      inputRef={ref}
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
