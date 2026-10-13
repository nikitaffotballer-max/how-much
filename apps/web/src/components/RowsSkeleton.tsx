import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';

/** Скелетон списка в форме настоящих строк: заголовок дня, иконка, две строки текста, сумма. */
export function RowsSkeleton({ rows = 4, heading = true }: { rows?: number; heading?: boolean }) {
  return (
    <Box
      aria-busy
      aria-label="Загрузка"
      sx={{ bgcolor: 'background.paper', borderRadius: 4, p: { xs: 1.5, sm: 2 } }}
    >
      {heading && <Skeleton variant="text" width={120} height={24} sx={{ mx: 1.5 }} />}
      {Array.from({ length: rows }, (_, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 1.5, py: 1.25 }}>
          <Skeleton variant="circular" width={44} height={44} sx={{ flex: 'none' }} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="45%" height={22} />
            <Skeleton variant="text" width="70%" height={18} />
          </Box>
          <Skeleton variant="text" width={64} height={24} />
        </Box>
      ))}
    </Box>
  );
}
