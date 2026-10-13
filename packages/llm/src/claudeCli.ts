import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { z } from 'zod';
import { HCLlmError, type LlmProvider, type LlmRequest } from './provider.js';

export interface ClaudeCliOptions {
  /** Путь к Claude Code CLI; по умолчанию — `claude` из PATH. */
  binary?: string;
  /** Псевдоним модели: haiku — быстро и дёшево, sonnet — точнее. */
  model?: string;
  timeoutMs?: number;
}

/** Нужная нам часть ответа `claude -p --output-format json`. */
const cliResultSchema = z.object({
  is_error: z.boolean(),
  result: z.string().optional(),
  structured_output: z.unknown().optional(),
});

/** Достаёт из вывода CLI структурированный ответ и проверяет его схемой запроса. */
export function parseCliOutput<TSchema extends z.ZodType>(
  stdout: string,
  schema: TSchema,
): z.infer<TSchema> {
  let parsed: z.infer<typeof cliResultSchema>;
  try {
    parsed = cliResultSchema.parse(JSON.parse(stdout));
  } catch {
    throw new HCLlmError(`Claude CLI вернул не JSON: ${stdout.slice(0, 200)}`);
  }
  if (parsed.is_error) {
    throw new HCLlmError(`Claude CLI вернул ошибку: ${parsed.result ?? 'без текста'}`);
  }

  const answer = schema.safeParse(parsed.structured_output);
  if (!answer.success) {
    throw new HCLlmError(`Ответ модели не по схеме: ${z.prettifyError(answer.error)}`);
  }
  return answer.data;
}

/**
 * Claude через установленный Claude Code CLI — работает по подписке пользователя, без API-ключа.
 * Подходит для локальной разработки; для продакшена нужен провайдер с API-ключом.
 */
export function createClaudeCliProvider({
  binary = 'claude',
  model = 'haiku',
  timeoutMs = 120_000,
}: ClaudeCliOptions = {}): LlmProvider {
  return {
    name: `claude-cli:${model}`,

    generate<TSchema extends z.ZodType>(request: LlmRequest<TSchema>) {
      const args = [
        '--print',
        '--output-format',
        'json',
        '--json-schema',
        // CLI проверяет схему по draft-07, а Zod по умолчанию выдаёт draft 2020-12.
        JSON.stringify(z.toJSONSchema(request.schema, { target: 'draft-7' })),
        '--model',
        model,
        '--system-prompt',
        request.system,
        // Модели нужен только текст письма: без инструкций, сессий и внешних инструментов.
        '--tools',
        '',
        '--strict-mcp-config',
        '--no-session-persistence',
      ];

      return new Promise<z.infer<TSchema>>((resolve, reject) => {
        // Пустая временная папка: иначе CLI подхватит CLAUDE.md и настройки проекта.
        const child = spawn(binary, args, { cwd: tmpdir(), stdio: ['pipe', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';
        const timer = setTimeout(() => {
          child.kill();
          reject(new HCLlmError(`Claude CLI не ответил за ${timeoutMs / 1000} с`));
        }, timeoutMs);

        child.stdout.on('data', (chunk: Buffer) => (stdout += chunk.toString('utf8')));
        child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString('utf8')));
        child.on('error', (error: NodeJS.ErrnoException) => {
          clearTimeout(timer);
          reject(
            new HCLlmError(
              error.code === 'ENOENT'
                ? `Claude CLI не найден (${binary}). Укажите путь в CLAUDE_CLI_PATH.`
                : `Не удалось запустить Claude CLI: ${error.message}`,
            ),
          );
        });
        child.on('close', (code) => {
          clearTimeout(timer);
          if (code !== 0) {
            reject(
              new HCLlmError(`Claude CLI завершился с кодом ${code}: ${stderr.slice(0, 300)}`),
            );
            return;
          }
          try {
            resolve(parseCliOutput(stdout, request.schema));
          } catch (error) {
            reject(error);
          }
        });

        // Текст письма — через stdin: в аргументах командной строки есть ограничение длины.
        child.stdin.end(request.prompt, 'utf8');
      });
    },
  };
}
