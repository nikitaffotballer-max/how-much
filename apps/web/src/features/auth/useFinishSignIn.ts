import type { CurrentUser } from '@how-much/shared';
import { useLocation, useNavigate } from 'react-router';
import { useSetCurrentUser } from './useCurrentUser';

/** После входа или регистрации: запомнить пользователя и вернуть туда, куда он шёл. */
export function useFinishSignIn() {
  const setCurrentUser = useSetCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();

  return (user: CurrentUser) => {
    setCurrentUser(user);
    const from = (location.state as { from?: string } | null)?.from;
    navigate(from && from !== '/login' ? from : '/', { replace: true });
  };
}
