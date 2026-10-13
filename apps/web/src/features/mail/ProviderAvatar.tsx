import type { MailProviderKey } from '@how-much/shared';
import Box from '@mui/material/Box';
import { hcColors } from '../../theme/hcTheme';

/** Не логотипы сервисов, а свои значки в палитре приложения: буква и цвет. */
const PROVIDER_LOOK: Record<MailProviderKey, { mark: string; bg: string; fg: string }> = {
  yandex: { mark: 'Я', bg: hcColors.tertiaryContainer, fg: hcColors.tertiaryStrong },
  mailru: { mark: '@', bg: '#DCE6FF', fg: '#1F4BA5' },
  gmail: { mark: 'G', bg: hcColors.insightContainer, fg: hcColors.insightAccent },
};

export function ProviderAvatar({
  provider,
  size = 48,
}: {
  provider: MailProviderKey;
  size?: number;
}) {
  const look = PROVIDER_LOOK[provider];
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        flex: 'none',
        borderRadius: '50%',
        bgcolor: look.bg,
        color: look.fg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: size * 0.42,
      }}
    >
      {look.mark}
    </Box>
  );
}
