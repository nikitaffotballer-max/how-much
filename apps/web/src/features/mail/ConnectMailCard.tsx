import LockRounded from '@mui/icons-material/LockRounded';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  connectMailAccountSchema,
  detectMailProvider,
  HC_MAIL_PROVIDER_KEYS,
  HC_MAIL_PROVIDERS,
  type MailAccount,
  type MailProviderKey,
} from '@how-much/shared';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import { useMutation } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { hcApi } from '../../api/hcApi';
import { ServerError } from '../../components/ServerError';
import { EnvelopeIllustration } from '../../illustrations/EnvelopeIllustration';
import { hcColors } from '../../theme/hcTheme';
import { EmailField, PasswordField } from '../auth/authFields';
import { useCurrentUser } from '../auth/useCurrentUser';
import { ProviderAvatar } from './ProviderAvatar';

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <Box component="li" sx={{ display: 'flex', gap: 2 }}>
      <Box
        aria-hidden
        sx={{
          width: 32,
          height: 32,
          flex: 'none',
          borderRadius: '50%',
          bgcolor: hcColors.primary,
          color: '#FFFFFF',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {number}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="h2" component="h3" sx={{ fontSize: 17, lineHeight: '32px' }}>
          {title}
        </Typography>
        {children}
      </Box>
    </Box>
  );
}

function ProviderPicker({
  value,
  onChange,
}: {
  value: MailProviderKey;
  onChange: (provider: MailProviderKey) => void;
}) {
  return (
    <Box
      role="radiogroup"
      aria-label="Почтовый сервис"
      sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}
    >
      {HC_MAIL_PROVIDER_KEYS.map((key) => {
        const selected = key === value;
        return (
          <ButtonBase
            key={key}
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(key)}
            sx={{
              flex: '1 1 150px',
              justifyContent: 'flex-start',
              gap: 1.5,
              p: 1.5,
              borderRadius: 4,
              border: '2px solid',
              borderColor: selected ? hcColors.primary : hcColors.outlineVariant,
              bgcolor: selected ? hcColors.heroContainer : 'transparent',
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            <ProviderAvatar provider={key} size={36} />
            {HC_MAIL_PROVIDERS[key].name}
          </ButtonBase>
        );
      })}
    </Box>
  );
}

interface ConnectMailCardProps {
  onConnected: (account: MailAccount) => void;
  onCancel?: () => void;
}

/** Подключение ящика в три шага: сервис → пароль приложения → адрес и пароль (ТЗ, экран 3). */
export function ConnectMailCard({ onConnected, onCancel }: ConnectMailCardProps) {
  const { data: user } = useCurrentUser();
  // Чаще всего чеки приходят на тот же адрес, с которым человек зарегистрировался.
  const userEmail = user?.email ?? '';
  const form = useForm({
    resolver: zodResolver(connectMailAccountSchema),
    defaultValues: {
      provider: detectMailProvider(userEmail) ?? 'yandex',
      login: userEmail,
      appPassword: '',
    },
  });
  const connect = useMutation({ mutationFn: hcApi.connectMailAccount, onSuccess: onConnected });
  const { errors } = form.formState;
  const providerKey = useWatch({ control: form.control, name: 'provider' });
  const provider = HC_MAIL_PROVIDERS[providerKey];
  const loginField = form.register('login');

  return (
    <Box
      component="section"
      aria-labelledby="connect-mail-title"
      sx={{
        bgcolor: 'background.paper',
        borderRadius: 7,
        p: { xs: 2.5, md: 4 },
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <Box sx={{ flex: 1 }}>
          <Typography id="connect-mail-title" variant="h2" sx={{ fontSize: 22 }}>
            Подключите почту с чеками
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Три шага — и покупки начнут появляться сами. Мы читаем только письма от магазинов и
            операторов чеков.
          </Typography>
        </Box>
        <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
          <EnvelopeIllustration width={140} />
        </Box>
      </Box>

      <Box
        component="form"
        noValidate
        onSubmit={form.handleSubmit((values) => connect.mutate(values))}
      >
        <Box
          component="ol"
          sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 3 }}
        >
          <Step number={1} title="Где ваша почта?">
            <ProviderPicker
              value={providerKey}
              onChange={(key) => form.setValue('provider', key)}
            />
          </Step>

          <Step number={2} title="Создайте пароль приложения">
            <Box
              component="ul"
              sx={{
                m: 0,
                pl: 2.5,
                display: 'flex',
                flexDirection: 'column',
                gap: 0.75,
                color: 'text.secondary',
                fontSize: 15,
              }}
            >
              {provider.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </Box>
            <Button
              variant="outlined"
              href={provider.appPasswordUrl}
              target="_blank"
              rel="noopener noreferrer"
              endIcon={<OpenInNewRounded />}
              sx={{ alignSelf: 'flex-start' }}
            >
              Открыть настройки {provider.name}
            </Button>
          </Step>

          <Step number={3} title="Вставьте адрес и пароль">
            <EmailField
              {...loginField}
              onChange={(event) => {
                void loginField.onChange(event);
                // Ввели адрес на @ya.ru — сами переключаем сервис на Яндекс.
                const detected = detectMailProvider(event.target.value);
                if (detected) form.setValue('provider', detected);
              }}
              label="Адрес почты"
              error={Boolean(errors.login)}
              helperText={errors.login?.message}
            />
            <PasswordField
              {...form.register('appPassword')}
              label="Пароль приложения"
              autoComplete="off"
              error={Boolean(errors.appPassword)}
              helperText={
                errors.appPassword?.message ?? 'Не пароль от почты, а созданный на шаге 2'
              }
            />
            <Box
              sx={{
                display: 'flex',
                gap: 1.5,
                p: 1.5,
                borderRadius: 4,
                bgcolor: hcColors.surfaceContainer,
                fontSize: 14,
                color: 'text.secondary',
              }}
            >
              <LockRounded sx={{ color: hcColors.primary, fontSize: 20, mt: 0.25 }} />
              Пароль приложения открывает только почту, и его можно отозвать в любой момент. Мы
              храним его зашифрованным и не трогаем письма: не читаем личную переписку, не помечаем
              прочитанным и не удаляем.
            </Box>
            <ServerError error={connect.error} />
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button type="submit" variant="contained" size="large" loading={connect.isPending}>
                Проверить и подключить
              </Button>
              {onCancel && (
                <Button size="large" onClick={onCancel}>
                  Отмена
                </Button>
              )}
            </Box>
          </Step>
        </Box>
      </Box>
    </Box>
  );
}
