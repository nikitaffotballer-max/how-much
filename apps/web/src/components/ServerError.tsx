import Alert from '@mui/material/Alert';
import { HCApiError } from '../api/hcApi';

/** Понятный текст ошибки: сообщение от API или общее, если сервер недоступен. */
export function ServerError({ error }: { error: unknown }) {
  if (!error) return null;
  const message =
    error instanceof HCApiError
      ? error.message
      : 'Не удалось связаться с сервером. Попробуйте ещё раз.';
  return (
    <Alert severity="error" sx={{ borderRadius: 3 }}>
      {message}
    </Alert>
  );
}
