import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { Link } from 'react-router';
import { EnvelopeIllustration } from '../../illustrations/EnvelopeIllustration';

/** Пустое состояние: чеков ещё нет — подсказываем, откуда они возьмутся. */
export function EmptyDashboard() {
  return (
    <Box
      component="section"
      sx={{
        bgcolor: '#FFFFFF',
        borderRadius: 7,
        px: 3,
        py: 6,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 2,
      }}
    >
      <EnvelopeIllustration width={240} />
      <Typography variant="h2" component="h2" sx={{ fontSize: 24 }}>
        Здесь появятся ваши траты
      </Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 440 }}>
        Подключите почту, куда приходят электронные чеки, — и мы разложим покупки по товарам и
        категориям.
      </Typography>
      <Button component={Link} to="/settings" variant="contained" size="large">
        Подключить почту
      </Button>
    </Box>
  );
}
