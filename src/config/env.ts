import { z } from 'zod';

const postgresUrl = z
  .url()
  .refine((value) => /^postgres(ql)?:\/\//.test(value), {
    message: 'Debe ser una URL de PostgreSQL',
  });

const booleanString = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

const positiveInt = z.coerce.number().int().positive();

const KEY_BYTES = 32;

function decodeKey(value: string): Buffer | undefined {
  const key = Buffer.from(value, 'base64');
  return key.length === KEY_BYTES && key.toString('base64') === value
    ? key
    : undefined;
}

const base64Key = z.string().transform((value, ctx) => {
  const key = decodeKey(value);
  if (!key) {
    ctx.addIssue({
      code: 'custom',
      message: `Debe ser una llave de ${KEY_BYTES} bytes en base64`,
    });
    return z.NEVER;
  }
  return key;
});

const versionedKeys = z.string().transform((value, ctx) => {
  const keys = new Map<number, Buffer>();

  for (const entry of value.split(',').map((part) => part.trim())) {
    const match = /^([1-9]\d*):(.+)$/.exec(entry);
    const key = match ? decodeKey(match[2]) : undefined;

    if (!match || !key || keys.has(Number(match[1]))) {
      ctx.addIssue({
        code: 'custom',
        message: `Formato: <versión>:<llave de ${KEY_BYTES} bytes en base64>, separadas por coma y con versiones únicas`,
      });
      return z.NEVER;
    }
    keys.set(Number(match[1]), key);
  }

  return keys;
});

const corsOrigins = z
  .string()
  .default('')
  .transform((value) =>
    value
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  )
  .pipe(z.array(z.url({ protocol: /^https?$/ })));

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(3000),

    DATABASE_URL: postgresUrl,
    // Solo lo usa el CLI de Prisma
    DIRECT_URL: postgresUrl.optional(),

    CORS_ORIGINS: corsOrigins,
    SWAGGER_ENABLED: booleanString.default(false),

    THROTTLE_GLOBAL_PER_MINUTE: positiveInt.default(100),
    THROTTLE_FORM_PER_MINUTE: positiveInt.default(3),
    THROTTLE_FORM_PER_DAY: positiveInt.default(20),
    THROTTLE_AUTH_PER_MINUTE: positiveInt.default(5),
    THROTTLE_REFRESH_PER_MINUTE: positiveInt.default(20),
    THROTTLE_PROFILE_PER_15_MINUTES: positiveInt.default(5),

    MAIL_HOST: z.string().min(1),
    MAIL_PORT: z.coerce.number().int().positive(),
    MAIL_SECURE: booleanString,
    MAIL_USER: z.string().min(1),
    MAIL_PASS: z.string().min(1),
    MAIL_TO: z.email(),

    ENCRYPTION_KEYS: versionedKeys,
    BLIND_INDEX_KEY: base64Key,
  })
  .refine(
    (env) =>
      [...env.ENCRYPTION_KEYS.values()].every(
        (key) => !key.equals(env.BLIND_INDEX_KEY),
      ),
    {
      path: ['BLIND_INDEX_KEY'],
      message: 'Debe ser distinta de las llaves de ENCRYPTION_KEYS',
    },
  );

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Variables de entorno inválidas:\n${problems}`);
  }

  return result.data;
}
