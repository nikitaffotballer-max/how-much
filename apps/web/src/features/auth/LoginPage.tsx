import { zodResolver } from '@hookform/resolvers/zod';
import { credentialsSchema } from '@how-much/shared';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link as RouterLink } from 'react-router';
import { hcApi } from '../../api/hcApi';
import { AuthLayout } from './AuthLayout';
import { DemoSignIn, EmailField, FormHeader, PasswordField, ServerError } from './authFields';
import { useFinishSignIn } from './useFinishSignIn';

export function LoginPage() {
  const finishSignIn = useFinishSignIn();
  const login = useMutation({ mutationFn: hcApi.login, onSuccess: finishSignIn });
  const form = useForm({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: '', password: '' },
  });
  const { errors } = form.formState;

  return (
    <AuthLayout>
      <Box
        component="form"
        noValidate
        onSubmit={form.handleSubmit((values) => login.mutate(values))}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
      >
        <FormHeader title="С возвращением" subtitle="Войдите, чтобы увидеть свои траты" />
        <EmailField
          {...form.register('email')}
          autoFocus
          error={Boolean(errors.email)}
          helperText={errors.email?.message}
        />
        <PasswordField
          {...form.register('password')}
          autoComplete="current-password"
          error={Boolean(errors.password)}
          helperText={errors.password?.message}
        />
        <ServerError error={login.error} />
        <Button type="submit" variant="contained" size="large" loading={login.isPending}>
          Войти
        </Button>
        <DemoSignIn />
        <Typography sx={{ textAlign: 'center', color: 'text.secondary' }}>
          Ещё нет аккаунта?{' '}
          <Link component={RouterLink} to="/register" sx={{ fontWeight: 600 }}>
            Зарегистрироваться
          </Link>
        </Typography>
      </Box>
    </AuthLayout>
  );
}
