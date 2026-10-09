import { validateEnv } from './env';

const key = (fill: number) => Buffer.alloc(32, fill).toString('base64');

const validEnv = {
  ENCRYPTION_KEYS: `1:${key(1)}`,
  BLIND_INDEX_KEY: key(2),
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
    expect(env.SWAGGER_ENABLED).toBe(false);
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

  describe('encryption keys', () => {
    it('should parse versioned keys into buffers', () => {
      const env = validateEnv({
        ...validEnv,
        ENCRYPTION_KEYS: `1:${key(1)}, 2:${key(3)}`,
      });

      expect([...env.ENCRYPTION_KEYS.keys()]).toEqual([1, 2]);
      expect(env.ENCRYPTION_KEYS.get(2)).toEqual(Buffer.alloc(32, 3));
      expect(env.BLIND_INDEX_KEY).toEqual(Buffer.alloc(32, 2));
    });

    it.each([
      ['a key without version', key(1)],
      ['a version 0', `0:${key(1)}`],
      ['a 16-byte key', `1:${Buffer.alloc(16, 1).toString('base64')}`],
      ['a non-base64 key', '1:not-base64!'],
      ['duplicated versions', `1:${key(1)},1:${key(3)}`],
      ['an empty value', ''],
    ])('should reject ENCRYPTION_KEYS with %s', (_label, value) => {
      expect(() =>
        validateEnv({ ...validEnv, ENCRYPTION_KEYS: value }),
      ).toThrow(/ENCRYPTION_KEYS/);
    });

    it('should reject a BLIND_INDEX_KEY that reuses an encryption key', () => {
      expect(() =>
        validateEnv({ ...validEnv, BLIND_INDEX_KEY: key(1) }),
      ).toThrow(/BLIND_INDEX_KEY/);
    });

    it('should never include key material in the error message', () => {
      const leaked = Buffer.alloc(16, 7).toString('base64');

      expect(() =>
        validateEnv({ ...validEnv, ENCRYPTION_KEYS: `1:${leaked}` }),
      ).toThrow(
        expect.not.objectContaining({
          message: expect.stringContaining(leaked) as string,
        }) as Error,
      );
    });
  });
});
