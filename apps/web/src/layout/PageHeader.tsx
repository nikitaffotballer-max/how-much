import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { UserMenu } from './UserMenu';

/** Заголовок страницы с аватаром справа — одинаковый на всех экранах приложения. */
export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Box
      component="header"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        minHeight: 64,
      }}
    >
      <Box>
        <Typography variant="h1">{title}</Typography>
        {subtitle && (
          <Typography sx={{ fontSize: 15, color: 'text.secondary' }}>{subtitle}</Typography>
        )}
      </Box>
      <UserMenu />
    </Box>
  );
}
