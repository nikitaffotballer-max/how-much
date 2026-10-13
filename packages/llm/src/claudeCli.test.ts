import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { parseCliOutput } from './claudeCli.js';
import { HCLlmError } from './provider.js';

const schema = z.object({ answer: z.number() });
const output = (fields: Record<string, unknown>) =>
  JSON.stringify({ type: 'result', is_error: false, result: '', ...fields });

describe('parseCliOutput', () => {
  it('возвращает структурированный ответ, проверенный схемой', () => {
    expect(parseCliOutput(output({ structured_output: { answer: 5 } }), schema)).toEqual({
      answer: 5,
    });
  });

  it('отклоняет ответ не по схеме, ошибку CLI и не-JSON', () => {
    expect(() => parseCliOutput(output({ structured_output: { answer: 'пять' } }), schema)).toThrow(
      HCLlmError,
    );
    expect(() => parseCliOutput(output({ is_error: true, result: 'limit' }), schema)).toThrow(
      /limit/,
    );
    expect(() => parseCliOutput('Error: not logged in', schema)).toThrow(/не JSON/);
  });
});
