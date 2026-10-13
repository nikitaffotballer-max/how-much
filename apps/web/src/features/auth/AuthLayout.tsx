import CategoryRounded from '@mui/icons-material/CategoryRounded';
import MarkEmailReadRounded from '@mui/icons-material/MarkEmailReadRounded';
import TrendingUpRounded from '@mui/icons-material/TrendingUpRounded';
import type { SvgIconComponent } from '@mui/icons-material';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { HCLogo } from '../../components/HCLogo';
import { ReceiptCoinsIllustration } from '../../illustrations/ReceiptCoinsIllustration';
import { hcColors } from '../../theme/hcTheme';

const BENEFITS: { icon: SvgIconComponent; text: string }[] = [
  { icon: MarkEmailReadRounded, text: 'Чеки сами приходят с почты — ничего не нужно сканировать' },
  { icon: CategoryRounded, text: 'Траты по товарам: кофе, сладкое, бытовая химия' },
  { icon: TrendingUpRounded, text: 'Личная инфляция: как дорожает именно ваша корзина' },
];

/** Экран входа/регистрации: слева — о сервисе, справа — форма. На телефоне блоки встают друг под друга. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{ minHeight: '100vh', display: 'flex', flexWrap: 'wrap', p: { xs: 1.5, md: 2 }, gap: 2 }}
    >
      <Box
        component="aside"
        sx={{
          flex: '1 1 420px',
          bgcolor: hcColors.heroContainer,
          borderRadius: 7,
          p: { xs: 3, md: 6 },
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <HCLogo />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography
            component="p"
            sx={{
              fontSize: { xs: 32, md: 44 },
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              color: hcColors.onPrimaryContainer,
            }}
          >
            Хм… а сколько на самом деле?
          </Typography>
          <Typography sx={{ fontSize: 17, color: '#0B3B27', maxWidth: 460 }}>
            Узнайте, на что уходят деньги — не по магазинам, а по каждому товару в чеке.
          </Typography>
        </Box>
        <Box sx={{ alignSelf: 'center', display: { xs: 'none', sm: 'block' } }}>
          <ReceiptCoinsIllustration width={320} />
        </Box>
        <Box
          component="ul"
          sx={{
            listStyle: 'none',
            m: 0,
            p: 0,
            mt: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
          }}
        >
          {BENEFITS.map(({ icon: Icon, text }) => (
            <Box
              component="li"
              key={text}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                fontSize: 15,
                color: '#0B3B27',
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  bgcolor: 'rgba(255,255,255,0.7)',
                  color: hcColors.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 'none',
                }}
              >
                <Icon fontSize="small" />
              </Box>
              {text}
            </Box>
          ))}
        </Box>
      </Box>

      <Box
        component="main"
        sx={{
          flex: '1 1 420px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
          px: { xs: 1, md: 4 },
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 420 }}>{children}</Box>
      </Box>
    </Box>
  );
}
