import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

/** Секция настроек: заголовок и белая карточка — одинаково для профиля, подписки и аккаунта. */
export function SettingsSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <Box
      component="section"
      aria-labelledby={id}
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <Typography
        id={id}
        variant="h2"
        sx={{ minHeight: 40, display: 'flex', alignItems: 'center' }}
      >
        {title}
      </Typography>
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 4,
          p: { xs: 2.5, md: 3 },
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
