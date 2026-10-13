/**
 * Почтовые провайдеры, которые можно подключить по IMAP (ТЗ, 3.2).
 * Общие для фронтенда (инструкции на экране подключения) и воркера (адрес сервера).
 */
export const HC_MAIL_PROVIDER_KEYS = ['yandex', 'mailru', 'gmail'] as const;

export type MailProviderKey = (typeof HC_MAIL_PROVIDER_KEYS)[number];

export interface MailProviderInfo {
  name: string;
  imap: { host: string; port: number };
  /** Домены почтовых адресов провайдера — по ним угадываем провайдера из email. */
  domains: readonly string[];
  /** Страница, где создаётся пароль приложения. */
  appPasswordUrl: string;
  /** Шаги инструкции «как получить пароль приложения». */
  steps: readonly string[];
}

export const HC_MAIL_PROVIDERS: Record<MailProviderKey, MailProviderInfo> = {
  yandex: {
    name: 'Яндекс Почта',
    imap: { host: 'imap.yandex.ru', port: 993 },
    domains: ['yandex.ru', 'ya.ru', 'yandex.com', 'yandex.by', 'yandex.kz'],
    appPasswordUrl: 'https://id.yandex.ru/security/app-passwords',
    steps: [
      'В настройках Почты откройте «Почтовые программы» и включите доступ по IMAP с паролями приложений.',
      'В Яндекс ID откройте «Безопасность» → «Пароли приложений» и создайте пароль для Почты.',
      'Скопируйте пароль из 16 букв и вставьте его в форму ниже.',
    ],
  },
  mailru: {
    name: 'Почта Mail',
    imap: { host: 'imap.mail.ru', port: 993 },
    domains: ['mail.ru', 'inbox.ru', 'list.ru', 'bk.ru', 'internet.ru'],
    appPasswordUrl: 'https://account.mail.ru/user/2-step-auth/passwords/',
    steps: [
      'Откройте настройки аккаунта → «Безопасность» → «Пароли для внешних приложений».',
      'Нажмите «Добавить», укажите название «Хау мач» и выберите доступ «Только чтение почты».',
      'Скопируйте созданный пароль и вставьте его в форму ниже.',
    ],
  },
  gmail: {
    name: 'Gmail',
    imap: { host: 'imap.gmail.com', port: 993 },
    domains: ['gmail.com', 'googlemail.com'],
    appPasswordUrl: 'https://myaccount.google.com/apppasswords',
    steps: [
      'Включите двухэтапную аутентификацию в аккаунте Google — без неё пароли приложений недоступны.',
      'Откройте страницу «Пароли приложений» и создайте пароль с названием «Хау мач».',
      'Скопируйте пароль из 16 букв и вставьте его в форму ниже.',
    ],
  },
};

/** Провайдер по адресу почты: «ivan@ya.ru» → yandex. Для своих доменов вернёт null. */
export function detectMailProvider(email: string): MailProviderKey | null {
  const domain = email.trim().toLowerCase().split('@')[1];
  if (!domain) return null;
  return (
    HC_MAIL_PROVIDER_KEYS.find((key) => HC_MAIL_PROVIDERS[key].domains.includes(domain)) ?? null
  );
}
