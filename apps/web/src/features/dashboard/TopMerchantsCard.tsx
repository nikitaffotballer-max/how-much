import { formatRub, type DashboardSummary } from '@how-much/shared';
import StorefrontRounded from '@mui/icons-material/StorefrontRounded';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { hcColors } from '../../theme/hcTheme';

const receiptsWord = new Intl.PluralRules('ru-RU');
const RECEIPT_FORMS: Record<string, string> = { one: 'чек', few: 'чека', many: 'чеков' };

/** Топ магазинов за период: полоска показывает долю от самого дорогого. */
export function TopMerchantsCard({ topMerchants }: Pick<DashboardSummary, 'topMerchants'>) {
  if (topMerchants.length === 0) return null;
  const max = topMerchants[0]?.total ?? 1;

  return (
    <Box
      component="section"
      aria-labelledby="merchants-title"
      sx={{
        flex: '1 1 300px',
        minWidth: 0,
        bgcolor: '#FFFFFF',
        borderRadius: 4,
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Typography variant="h2" id="merchants-title">
        Где тратили
      </Typography>
      <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1.75 }}>
        {topMerchants.map((merchant) => (
          <Box component="li" key={merchant.name} sx={{ display: 'flex', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                flex: 'none',
                borderRadius: '50%',
                bgcolor: hcColors.surfaceContainer,
                color: hcColors.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <StorefrontRounded fontSize="small" />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                <Typography noWrap sx={{ fontWeight: 500 }}>
                  {merchant.name}
                </Typography>
                <Typography sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {formatRub(merchant.total)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <Box
                  sx={{
                    flex: 1,
                    height: 6,
                    borderRadius: 1,
                    bgcolor: hcColors.surfaceContainer,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    className="hc-grow-x"
                    sx={{
                      width: `${Math.max(4, Math.round((merchant.total / max) * 100))}%`,
                      height: '100%',
                      bgcolor: '#9ED9BC',
                      borderRadius: 1,
                    }}
                  />
                </Box>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                  {merchant.receiptsCount}{' '}
                  {RECEIPT_FORMS[receiptsWord.select(merchant.receiptsCount)] ?? 'чека'}
                </Typography>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
