import type { CurrentUser } from '@how-much/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { hcApi } from '../../api/hcApi';

export const CURRENT_USER_KEY = ['current-user'] as const;

/** Кто сейчас вошёл. data === null — гость. */
export function useCurrentUser() {
  return useQuery({
    queryKey: CURRENT_USER_KEY,
    queryFn: hcApi.getCurrentUser,
    staleTime: Infinity,
  });
}

/** После входа кладём пользователя в кэш сразу, без лишнего запроса /me. */
export function useSetCurrentUser() {
  const queryClient = useQueryClient();
  return (user: CurrentUser | null) => queryClient.setQueryData(CURRENT_USER_KEY, user);
}

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: hcApi.logout,
    onSuccess: () => {
      // Данные прошлого пользователя не должны мелькнуть следующему.
      queryClient.clear();
      queryClient.setQueryData(CURRENT_USER_KEY, null);
      navigate('/login', { replace: true });
    },
  });
}

/** Сколько дней осталось до конца периода подписки (округляем вверх: «остался 1 день» до самого конца). */
export function daysLeft(periodEndsAt: string | null, now = new Date()): number | null {
  if (!periodEndsAt) return null;
  const ms = new Date(periodEndsAt).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}
