import CategoryRounded from '@mui/icons-material/CategoryRounded';
import MarkEmailReadRounded from '@mui/icons-material/MarkEmailReadRounded';
import TrendingUpRounded from '@mui/icons-material/TrendingUpRounded';
import type { SvgIconComponent } from '@mui/icons-material';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Link } from 'react-router';
import type { ReactNode } from 'react';
import { HCLogo } from '../../components/HCLogo';
import { ReceiptCoinsIllustration } from '../../illustrations/ReceiptCoinsIllustration';
import { hcColors } from '../../theme/hcTheme';

const BENEFITS: { icon: SvgIconComponent; text: string }[] = [
  { icon: MarkEmailReadRounded, text: 'Чеки сами приходят с почты — ничего не нужно сканировать' },
  { icon: CategoryRounded, text: 'Траты по товарам: кофе, сладкое, бытовая химия' },
  { icon: TrendingUpRounded, text: 'Личная инфляция: как дорожает именно ваша корзина' },
];

const ON_HERO = '#0B3B27';

function Brand() {
  return (
    <Box
      sx={{ gridArea: 'brand', display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 4 } }}
    >
      <Box
        component={Link}
        to="/"
        aria-label="На главную"
        sx={{ color: 'inherit', textDecoration: 'none', alignSelf: 'flex-start' }}
      >
        <HCLogo />
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography
          component="p"
          sx={{
            fontSize: { xs: 24, md: 44 },
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            color: hcColors.onPrimaryContainer,
          }}
        >
          Хм… а сколько на самом деле?
        </Typography>
        <Typography
          sx={{ display: { xs: 'none', md: 'block' }, fontSize: 17, color: ON_HERO, maxWidth: 460 }}
        >
          Узнайте, на что уходят деньги — не по магазинам, а по каждому товару в чеке.
        </Typography>
      </Box>
      <Box sx={{ alignSelf: 'center', display: { xs: 'none', md: 'block' } }}>
        <ReceiptCoinsIllustration width={300} />
      </Box>
    </Box>
  );
}

function Benefits() {
  return (
    <Box
      component="ul"
      sx={{
        gridArea: 'benefits',
        alignSelf: 'end',
        listStyle: 'none',
        m: 0,
        p: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      {BENEFITS.map(({ icon: Icon, text }) => (
        <Box
          component="li"
          key={text}
          sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontSize: 15, color: ON_HERO }}
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
  );
}

/**
 * Экран входа/регистрации: вся страница на зелёном фоне, форма — белая карточка поверх.
 * На телефоне сначала короткий заголовок и сразу форма (без прокрутки), преимущества — ниже формы.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: hcColors.heroContainer }}>
      <Box
        sx={{
          minHeight: '100vh',
          maxWidth: 1280,
          mx: 'auto',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr minmax(380px, 480px)' },
          gridTemplateRows: { md: '1fr auto' },
          gridTemplateAreas: {
            xs: '"brand" "form" "benefits"',
            md: '"brand form" "benefits form"',
          },
          columnGap: { md: 8 },
          rowGap: { xs: 2.5, md: 4 },
          p: { xs: 2, md: 6 },
        }}
      >
        <Brand />
        <Box
          component="main"
          className="hc-page"
          sx={{
            gridArea: 'form',
            alignSelf: 'center',
            bgcolor: 'background.paper',
            borderRadius: 4,
            p: { xs: 3, md: 5 },
            boxShadow: '0 1px 3px rgba(0, 33, 20, 0.08), 0 8px 24px rgba(0, 33, 20, 0.06)',
          }}
        >
          {children}
        </Box>
        <Benefits />
      </Box>
    </Box>
  );
}
