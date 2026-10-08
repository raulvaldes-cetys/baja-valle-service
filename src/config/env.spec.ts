import { validateEnv } from './env';

const validEnv = {
  DATABASE_URL: 'postgresql://app:secret@localhost:5432/baja_valle',
  MAIL_HOST: 'smtp.example.com',
  MAIL_PORT: '465',
  MAIL_SECURE: 'true',
  MAIL_USER: 'no-reply@example.com',
  MAIL_PASS: 'secret',
  MAIL_TO: 'ventas@example.com',
};

describe('validateEnv', () => {
  it('should apply defaults and coerce types', () => {
    const env = validateEnv(validEnv);

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.MAIL_PORT).toBe(465);
    expect(env.MAIL_SECURE).toBe(true);
    expect(env.CORS_ORIGINS).toEqual([]);
  });

  it('should split and validate CORS_ORIGINS', () => {
    const env = validateEnv({
      ...validEnv,
      CORS_ORIGINS: 'https://dashboard.example.com, http://localhost:4321',
    });

    expect(env.CORS_ORIGINS).toEqual([
      'https://dashboard.example.com',
      'http://localhost:4321',
    ]);
  });

  it('should reject a CORS origin that is not an http(s) URL', () => {
    expect(() => validateEnv({ ...validEnv, CORS_ORIGINS: '*' })).toThrow(
      /CORS_ORIGINS/,
    );
  });

  it('should fail when a required variable is missing', () => {
    expect(() => validateEnv({ ...validEnv, MAIL_PASS: undefined })).toThrow(
      /MAIL_PASS/,
    );
  });

  it('should reject a DATABASE_URL that is not PostgreSQL', () => {
    expect(() =>
      validateEnv({ ...validEnv, DATABASE_URL: 'mysql://localhost/db' }),
    ).toThrow(/DATABASE_URL/);
  });

  it('should never include secret values in the error message', () => {
    const leakedSecret = 'super-secret-password';

    expect(() =>
      validateEnv({
        ...validEnv,
        DATABASE_URL: `not-a-url-${leakedSecret}`,
      }),
    ).toThrow(
      expect.not.objectContaining({
        message: expect.stringContaining(leakedSecret) as string,
      }) as Error,
    );
  });
});
