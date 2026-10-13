import { HC_CATEGORIES, formatRub, shareOf, type DashboardSummary } from '@how-much/shared';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { CategoryIcon } from '../../components/CategoryIcon';

type CategoryGridProps = Pick<DashboardSummary, 'byCategory' | 'total'>;

/** Плитки категорий: иконка, сумма, доля и полоска доли в цвете категории. */
export function CategoryGrid({ byCategory, total }: CategoryGridProps) {
  const sorted = [...byCategory].sort((a, b) => b.total - a.total);

  return (
    <Box
      component="section"
      aria-labelledby="categories-title"
      sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <Typography variant="h2" id="categories-title">
          Куда ушли деньги
        </Typography>
        <Chip label="по товарам" size="small" variant="outlined" />
      </Box>
      <Box
        sx={{
          display: 'grid',
          // Ровные ряды без «сироты»: 6 категорий делятся на 2, 3 и 6 колонок.
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(3, minmax(0, 1fr))',
            lg: 'repeat(6, minmax(0, 1fr))',
          },
          gap: 1.5,
        }}
      >
        {sorted.map(({ category, total: categoryTotal }) => {
          const meta = HC_CATEGORIES[category];
          const share = shareOf(categoryTotal, total);
          return (
            <Box
              key={category}
              sx={{
                bgcolor: '#FFFFFF',
                borderRadius: 6,
                p: 2.25,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <CategoryIcon category={category} />
                <Box sx={{ fontSize: 14, fontWeight: 600, color: 'text.secondary' }}>{share}%</Box>
              </Box>
              <Box>
                <Box sx={{ fontSize: 15, color: 'text.secondary' }}>{meta.name}</Box>
                <Box sx={{ fontSize: 22, fontWeight: 700 }}>{formatRub(categoryTotal)}</Box>
              </Box>
              <Box aria-hidden sx={{ height: 8, borderRadius: 1, bgcolor: '#F0F2F0' }}>
                <Box sx={{ width: `${share}%`, height: 8, borderRadius: 1, bgcolor: meta.color }} />
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
