import { zodResolver } from '@hookform/resolvers/zod';
import { credentialsSchema } from '@how-much/shared';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link as RouterLink } from 'react-router';
import { z } from 'zod';
import { hcApi } from '../../api/hcApi';
import { AuthLayout } from './AuthLayout';
import { ServerError } from '../../components/ServerError';
import { EmailField, FormHeader, PasswordField } from './authFields';
import { useFinishSignIn } from './useFinishSignIn';

/** Согласие на обработку персональных данных обязательно по 152-ФЗ (ТЗ, раздел 9). */
const registerFormSchema = credentialsSchema.extend({
  consent: z.boolean().refine(Boolean, { error: 'Без согласия мы не можем создать аккаунт' }),
});

export function RegisterPage() {
  const finishSignIn = useFinishSignIn();
  const register = useMutation({ mutationFn: hcApi.register, onSuccess: finishSignIn });
  const form = useForm({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { email: '', password: '', consent: false },
  });
  const { errors } = form.formState;

  return (
    <AuthLayout>
      <Box
        component="form"
        noValidate
        onSubmit={form.handleSubmit(({ email, password }) => register.mutate({ email, password }))}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
      >
        <FormHeader title="Создать аккаунт" subtitle="14 дней Pro бесплатно — карта не нужна" />
        <EmailField
          {...form.register('email')}
          autoFocus
          error={Boolean(errors.email)}
          helperText={errors.email?.message}
        />
        <PasswordField
          {...form.register('password')}
          autoComplete="new-password"
          error={Boolean(errors.password)}
          helperText={errors.password?.message ?? 'Не короче 8 символов'}
        />
        <Box>
          <FormControlLabel
            control={<Checkbox {...form.register('consent')} />}
            label={
              <Typography sx={{ fontSize: 14 }}>
                Согласен с обработкой персональных данных
              </Typography>
            }
          />
          {errors.consent && <FormHelperText error>{errors.consent.message}</FormHelperText>}
        </Box>
        <ServerError error={register.error} />
        <Button type="submit" variant="contained" size="large" loading={register.isPending}>
          Зарегистрироваться
        </Button>
        <Typography sx={{ textAlign: 'center', color: 'text.secondary' }}>
          Уже есть аккаунт?{' '}
          <Link component={RouterLink} to="/login" sx={{ fontWeight: 600 }}>
            Войти
          </Link>
        </Typography>
      </Box>
    </AuthLayout>
  );
}
