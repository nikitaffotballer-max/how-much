import {
  formatRub,
  HC_CATEGORIES,
  HC_PLAN_LIMITS,
  HC_PRO_PRICES,
  HC_TRIAL_DAYS,
  plural,
  type CategoryKey,
  type DashboardSummary,
} from '@how-much/shared';
import CheckRounded from '@mui/icons-material/CheckRounded';
import DeleteSweepRounded from '@mui/icons-material/DeleteSweepRounded';
import InsightsRounded from '@mui/icons-material/InsightsRounded';
import LockRounded from '@mui/icons-material/LockRounded';
import MarkEmailReadRounded from '@mui/icons-material/MarkEmailReadRounded';
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded';
import VisibilityOffRounded from '@mui/icons-material/VisibilityOffRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { CategoryIcon } from '../../components/CategoryIcon';
import { HCLogo } from '../../components/HCLogo';
import { periodLabels } from '../../lib/periods';
import { hcColors } from '../../theme/hcTheme';
import { CategoryGrid } from '../dashboard/CategoryGrid';
import { HeroCard } from '../dashboard/HeroCard';

const CONTENT_WIDTH = 1120;

/** Один чек «как видит банк» и «как видим мы» — суть продукта в одной картинке. */
const SAMPLE_RECEIPT: { name: string; category: CategoryKey; sum: number }[] = [
  { name: 'Молоко 3,2%', category: 'groceries', sum: 10_990 },
  { name: 'Кофе в зёрнах', category: 'cafe', sum: 89_900 },
  { name: 'Средство для посуды', category: 'home', sum: 24_900 },
  { name: 'Витамин D', category: 'health', sum: 59_000 },
  { name: 'Хлеб, сыр, овощи', category: 'groceries', sum: 49_210 },
];
const SAMPLE_TOTAL = SAMPLE_RECEIPT.reduce((sum, item) => sum + item.sum, 0);

/** Пример дашборда для лендинга: подписан как пример, в приложении таких цифр нет. */
const SAMPLE_SUMMARY: Pick<
  DashboardSummary,
  'total' | 'previousTotal' | 'byCategory' | 'period' | 'previousPeriod'
> = {
  total: 3_841_000,
  previousTotal: 4_215_000,
  byCategory: [
    { category: 'groceries', total: 1_920_000 },
    { category: 'marketplaces', total: 784_000 },
    { category: 'cafe', total: 512_000 },
    { category: 'health', total: 298_000 },
    { category: 'home', total: 214_000 },
    { category: 'other', total: 113_000 },
  ],
  period: { kind: 'month', from: '2026-10-01', to: '2026-10-20' },
  previousPeriod: { from: '2026-09-01', to: '2026-09-20' },
};

function Section({
  id,
  title,
  lead,
  children,
}: {
  id: string;
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <Box
      component="section"
      aria-labelledby={id}
      sx={{ maxWidth: CONTENT_WIDTH, mx: 'auto', px: 2, py: { xs: 6, md: 9 } }}
    >
      <Typography
        id={id}
        component="h2"
        sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 700, letterSpacing: '-0.02em' }}
      >
        {title}
      </Typography>
      {lead && (
        <Typography sx={{ fontSize: 18, color: 'text.secondary', mt: 1.5, maxWidth: 640 }}>
          {lead}
        </Typography>
      )}
      <Box sx={{ mt: { xs: 3, md: 5 } }}>{children}</Box>
    </Box>
  );
}

function TopBar() {
  return (
    <Box
      component="header"
      sx={{
        maxWidth: CONTENT_WIDTH,
        mx: 'auto',
        px: 2,
        minHeight: 72,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <Box sx={{ flex: 1 }}>
        <HCLogo />
      </Box>
      <Button component={Link} to="/login">
        Войти
      </Button>
      <Button
        component={Link}
        to="/register"
        variant="contained"
        sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
      >
        Начать бесплатно
      </Button>
    </Box>
  );
}

/** Слева — строчка из банковской выписки, справа — тот же чек по товарам. */
function BankVersusReceipt() {
  return (
    <Box
      aria-label="Пример: строка выписки и тот же чек по товарам"
      sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%', maxWidth: 420 }}
    >
      <Box
        sx={{
          bgcolor: 'rgba(255,255,255,0.6)',
          borderRadius: 4,
          px: 2.5,
          py: 2,
          display: 'flex',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>В выписке банка</Typography>
          <Typography sx={{ fontWeight: 600 }}>Супермаркет</Typography>
        </Box>
        <Typography sx={{ fontWeight: 700, alignSelf: 'center' }}>
          {formatRub(SAMPLE_TOTAL)}
        </Typography>
      </Box>
      <Box
        sx={{
          bgcolor: '#FFFFFF',
          borderRadius: 4,
          p: 2.5,
          boxShadow: '0 1px 3px rgba(0, 33, 20, 0.08), 0 12px 32px rgba(0, 33, 20, 0.08)',
        }}
      >
        <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1 }}>
          В «Хау мач» — что внутри
        </Typography>
        <Box className="hc-stagger" sx={{ display: 'grid', gap: 1.25 }}>
          {SAMPLE_RECEIPT.map((item) => (
            <Box key={item.name} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <CategoryIcon category={item.category} size={32} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography noWrap sx={{ fontSize: 15, fontWeight: 500 }}>
                  {item.name}
                </Typography>
                <Typography sx={{ fontSize: 12, color: HC_CATEGORIES[item.category].onContainer }}>
                  {HC_CATEGORIES[item.category].name}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap' }}>
                {formatRub(item.sum)}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function Hero() {
  return (
    <Box sx={{ bgcolor: hcColors.heroContainer }}>
      <TopBar />
      <Box
        sx={{
          maxWidth: CONTENT_WIDTH,
          mx: 'auto',
          px: 2,
          pt: { xs: 3, md: 6 },
          pb: { xs: 6, md: 10 },
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' },
          alignItems: 'center',
          gap: { xs: 5, md: 6 },
        }}
      >
        <Box className="hc-stagger" sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Typography
            component="h1"
            sx={{
              fontSize: { xs: 38, md: 56 },
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
              color: hcColors.onPrimaryContainer,
            }}
          >
            Куда уходят деньги — по каждому товару
          </Typography>
          <Typography sx={{ fontSize: { xs: 17, md: 20 }, color: '#0B3B27', maxWidth: 520 }}>
            Банк знает только магазин и сумму. «Хау мач» сам собирает электронные чеки из почты и
            показывает, сколько ушло на продукты, кофе и бытовую химию.
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
            <Button component={Link} to="/register" variant="contained" size="large">
              Начать бесплатно
            </Button>
            <Typography sx={{ fontSize: 14, color: '#0B3B27' }}>
              {HC_TRIAL_DAYS} дней Pro в подарок, карта не нужна
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: { xs: 'stretch', md: 'flex-end' } }}>
          <BankVersusReceipt />
        </Box>
      </Box>
    </Box>
  );
}

const STEPS = [
  {
    icon: <MarkEmailReadRounded />,
    title: 'Подключите почту',
    text: 'Mail.ru, Яндекс или Gmail — по пошаговой инструкции, один раз. Дальше чеки подтягиваются сами.',
  },
  {
    icon: <ReceiptLongRounded />,
    title: 'Мы разберём чеки',
    text: 'Находим письма от магазинов и операторов фискальных данных и раскладываем каждую позицию по категориям.',
  },
  {
    icon: <InsightsRounded />,
    title: 'Смотрите, куда уходят деньги',
    text: 'Итоги за день, неделю или месяц, сравнение с прошлым периодом, магазины и траты по дням.',
  },
];

function HowItWorks() {
  return (
    <Section
      id="how-title"
      title="Как это работает"
      lead="Без ручного ввода: достаточно один раз подключить почту, куда приходят чеки."
    >
      <Box
        component="ol"
        sx={{
          listStyle: 'none',
          m: 0,
          p: 0,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 2,
        }}
      >
        {STEPS.map((step, index) => (
          <Box
            component="li"
            key={step.title}
            sx={{
              bgcolor: '#FFFFFF',
              borderRadius: 4,
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  bgcolor: hcColors.primaryContainer,
                  color: hcColors.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {step.icon}
              </Box>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.secondary' }}>
                Шаг {index + 1}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 20, fontWeight: 700 }}>{step.title}</Typography>
            <Typography sx={{ color: 'text.secondary', lineHeight: 1.5 }}>{step.text}</Typography>
          </Box>
        ))}
      </Box>
    </Section>
  );
}

/** Настоящие компоненты дашборда на примерных цифрах — честнее любого скриншота. */
function DashboardPreview() {
  return (
    <Section
      id="preview-title"
      title="Так выглядит дашборд"
      lead="Те же блоки, что вы увидите после подключения почты. Цифры здесь — для примера."
    >
      <Box
        aria-hidden
        sx={{
          bgcolor: hcColors.surfaceContainer,
          borderRadius: 4,
          p: { xs: 1.5, md: 3 },
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          // Превью — картинка, а не интерфейс: кнопки и ссылки внутри не нажимаются.
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <HeroCard
          total={SAMPLE_SUMMARY.total}
          previousTotal={SAMPLE_SUMMARY.previousTotal}
          labels={periodLabels(SAMPLE_SUMMARY)}
        />
        <CategoryGrid byCategory={SAMPLE_SUMMARY.byCategory} total={SAMPLE_SUMMARY.total} />
      </Box>
    </Section>
  );
}

const PRIVACY = [
  {
    icon: <VisibilityOffRounded />,
    title: 'Только письма с чеками',
    text: 'Читаем письма от магазинов и операторов чеков. Личную переписку не открываем, письма не помечаем прочитанными и не удаляем.',
  },
  {
    icon: <LockRounded />,
    title: 'Отдельный пароль',
    text: 'Подключаем почту по паролю приложения, а не основному. Храним его зашифрованным; отозвать можно в любой момент в настройках почты.',
  },
  {
    icon: <DeleteSweepRounded />,
    title: 'Удаление в один клик',
    text: 'Удалите аккаунт в настройках — и мы сотрём все чеки, ящики и сохранённые письма.',
  },
];

function Privacy() {
  return (
    <Section id="privacy-title" title="Ваша почта — ваша">
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: { xs: 3, md: 4 },
        }}
      >
        {PRIVACY.map((item) => (
          <Box key={item.title} sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ color: hcColors.primary, pt: 0.25 }}>{item.icon}</Box>
            <Box>
              <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{item.title}</Typography>
              <Typography sx={{ color: 'text.secondary', lineHeight: 1.5 }}>{item.text}</Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Section>
  );
}

const months = (count: number) => `${count} ${plural(count, ['месяц', 'месяца', 'месяцев'])}`;
const mailboxes = (count: number) =>
  `${count} ${plural(count, ['почтовый ящик', 'почтовых ящика', 'почтовых ящиков'])}`;

const FREE = HC_PLAN_LIMITS.free;
const PRO = HC_PLAN_LIMITS.pro;

/** В тарифах — только то, что уже работает. Новые функции Pro добавляем сюда вместе с ними. */
const PLANS = [
  {
    name: 'Free',
    price: 'Бесплатно',
    note: 'навсегда',
    features: [
      mailboxes(FREE.mailAccounts),
      `Чеки за последние ${months(FREE.importMonths)}`,
      'Дашборд за текущий месяц',
      'Траты наличными вручную',
    ],
    highlighted: false,
  },
  {
    name: 'Pro',
    price: `${formatRub(HC_PRO_PRICES.month)} в месяц`,
    note: `или ${formatRub(HC_PRO_PRICES.year)} в год`,
    features: [
      `До ${mailboxes(PRO.mailAccounts)}`,
      `Чеки за ${months(PRO.importMonths)} при подключении`,
      'История без ограничений',
      'Любые периоды и сравнение с прошлым',
    ],
    highlighted: true,
  },
];

function Pricing() {
  return (
    <Section
      id="pricing-title"
      title="Тарифы"
      lead={`После регистрации — ${HC_TRIAL_DAYS} дней Pro бесплатно. Потом можно остаться на Free: чеки никуда не денутся.`}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 420px))' },
          gap: 2,
        }}
      >
        {PLANS.map((plan) => (
          <Box
            key={plan.name}
            sx={{
              bgcolor: plan.highlighted ? hcColors.heroContainer : '#FFFFFF',
              borderRadius: 4,
              p: { xs: 3, md: 4 },
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <Typography sx={{ fontSize: 20, fontWeight: 700 }}>{plan.name}</Typography>
            <Box>
              <Typography sx={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em' }}>
                {plan.price}
              </Typography>
              <Typography sx={{ color: 'text.secondary' }}>{plan.note}</Typography>
            </Box>
            <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1.25 }}>
              {plan.features.map((feature) => (
                <Box component="li" key={feature} sx={{ display: 'flex', gap: 1.25 }}>
                  <CheckRounded sx={{ color: hcColors.primary, fontSize: 22 }} />
                  {feature}
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    </Section>
  );
}

function FinalCallToAction() {
  return (
    <Box sx={{ px: 2, pb: { xs: 6, md: 9 } }}>
      <Box
        sx={{
          maxWidth: CONTENT_WIDTH,
          mx: 'auto',
          bgcolor: hcColors.primary,
          color: '#FFFFFF',
          borderRadius: 4,
          px: { xs: 3, md: 6 },
          py: { xs: 5, md: 6 },
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 3,
        }}
      >
        <Box>
          <Typography component="h2" sx={{ fontSize: { xs: 26, md: 32 }, fontWeight: 700 }}>
            Узнайте, куда уходят деньги
          </Typography>
          <Typography sx={{ opacity: 0.85, mt: 1 }}>
            Регистрация — минута, подключение почты — ещё пять.
          </Typography>
        </Box>
        <Button
          component={Link}
          to="/register"
          variant="contained"
          size="large"
          sx={{ bgcolor: '#FFFFFF', color: hcColors.primary, '&:hover': { bgcolor: '#E8F5EE' } }}
        >
          Начать бесплатно
        </Button>
      </Box>
    </Box>
  );
}

/** Лендинг (ТЗ, экран 1): гость видит его на главной вместо дашборда. */
export function LandingPage() {
  return (
    <Box className="hc-page" sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <Hero />
      <Box component="main">
        <HowItWorks />
        <DashboardPreview />
        <Privacy />
        <Pricing />
        <FinalCallToAction />
      </Box>
      <Box
        component="footer"
        sx={{
          maxWidth: CONTENT_WIDTH,
          mx: 'auto',
          px: 2,
          pb: 4,
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
          color: 'text.secondary',
          fontSize: 14,
        }}
      >
        <span>© {new Date().getFullYear()} Хау мач</span>
        <span>Оплата работает в тестовом режиме</span>
      </Box>
    </Box>
  );
}
