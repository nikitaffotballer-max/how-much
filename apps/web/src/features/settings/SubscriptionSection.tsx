import { HC_PLAN_LIMITS, plural, type CurrentUser } from '@how-much/shared';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { hcColors } from '../../theme/hcTheme';
import { daysLeft, useCurrentUser } from '../auth/useCurrentUser';
import { SettingsSection } from './SettingsSection';

const dateFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });

const free = HC_PLAN_LIMITS.free;
const FREE_SUMMARY =
  `${free.mailAccounts} почтовый ящик, история за ${free.historyMonths} ` +
  `${plural(free.historyMonths ?? 0, ['месяц', 'месяца', 'месяцев'])}, траты по категориям магазинов.`;

/** Что сказать о подписке: название тарифа и одна фраза о том, что будет дальше. */
function describe(user: CurrentUser): { title: string; text: string; pro: boolean } {
  const ends = user.periodEndsAt ? dateFormatter.format(new Date(user.periodEndsAt)) : '';
  const days = daysLeft(user.periodEndsAt) ?? 0;
  const left = `${plural(days, ['остался', 'осталось', 'осталось'])} ${days} ${plural(days, ['день', 'дня', 'дней'])}`;

  switch (user.subscriptionStatus) {
    case 'trialing':
      return {
        title: 'Pro · пробный период',
        text: `Бесплатно до ${ends}, ${left}. Потом — бесплатный тариф, все чеки сохранятся.`,
        pro: true,
      };
    case 'active':
      return {
        title: 'Pro',
        text: user.cancelAtPeriodEnd
          ? `Оплачено до ${ends}. Продление отменено — потом бесплатный тариф.`
          : `Оплачено до ${ends}, дальше продлится автоматически.`,
        pro: true,
      };
    case 'past_due':
      return {
        title: 'Pro · не прошла оплата',
        text: 'Не удалось списать оплату. Pro пока работает, попробуем списать ещё раз.',
        pro: true,
      };
    case 'canceled':
      return {
        title: 'Pro · продление отменено',
        text: `Pro работает до ${ends}, потом — бесплатный тариф.`,
        pro: true,
      };
    default:
      return { title: 'Бесплатный тариф', text: FREE_SUMMARY, pro: false };
  }
}

/** Статус подписки (ТЗ, экран 12). Оплата появится вместе с ЮKassa. */
export function SubscriptionSection() {
  const { data: user } = useCurrentUser();
  if (!user) return null;
  const { title, text, pro } = describe(user);

  return (
    <SettingsSection id="subscription-title" title="Подписка">
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            flex: 'none',
            borderRadius: '50%',
            bgcolor: pro ? hcColors.tertiaryContainer : hcColors.surfaceContainer,
            color: pro ? hcColors.tertiary : hcColors.onSurfaceVariant,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AutoAwesomeRounded />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 600 }}>{title}</Typography>
          <Typography sx={{ fontSize: 14, color: 'text.secondary', lineHeight: 1.5 }}>
            {text}
          </Typography>
        </Box>
      </Box>
    </SettingsSection>
  );
}
