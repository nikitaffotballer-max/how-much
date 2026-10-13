import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { CoffeeIllustration } from '../illustrations/CoffeeIllustration';

/** Заглушка для разделов, которые появятся на следующих этапах. */
export function ComingSoonPage({ title }: { title: string }) {
  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        textAlign: 'center',
        py: 8,
      }}
    >
      <CoffeeIllustration width={180} />
      <Typography variant="h1">{title}</Typography>
      <Typography color="text.secondary">
        Этот раздел ещё в работе — заварите кофе и загляните позже.
      </Typography>
    </Box>
  );
}
