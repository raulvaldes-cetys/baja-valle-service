import { z } from 'zod';

const postgresUrl = z
  .url()
  .refine((value) => /^postgres(ql)?:\/\//.test(value), {
    message: 'Debe ser una URL de PostgreSQL',
  });

const booleanString = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

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
  // Solo lo usa el CLI de Prisma para migraciones; la API no lo necesita en runtime
  DIRECT_URL: postgresUrl.optional(),

  CORS_ORIGINS: corsOrigins,
  SWAGGER_ENABLED: booleanString.default(false),

  MAIL_HOST: z.string().min(1),
  MAIL_PORT: z.coerce.number().int().positive(),
  MAIL_SECURE: booleanString,
  MAIL_USER: z.string().min(1),
  MAIL_PASS: z.string().min(1),
  MAIL_TO: z.email(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Valida process.env al arrancar. Si falta o es inválida alguna variable, la API no arranca.
 * El mensaje lista solo los nombres de las variables con error, nunca sus valores.
 */
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
