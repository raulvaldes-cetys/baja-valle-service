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

export const envSchema = z.object({
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
});

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
