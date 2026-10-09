import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { Env } from '../../config/env';
import { DecryptionError, EncryptionService } from './encryption.service';

const KEY_1 = randomBytes(32);
const KEY_2 = randomBytes(32);
const BLIND_KEY = randomBytes(32);
const CONTEXT = 'users.email';

function serviceWith(
  keys: [number, Buffer][],
  blindIndexKey = BLIND_KEY,
): EncryptionService {
  const values: Partial<Env> = {
    ENCRYPTION_KEYS: new Map(keys),
    BLIND_INDEX_KEY: blindIndexKey,
  };
  const config = {
    get: (name: keyof Env) => values[name],
  } as unknown as ConfigService<Env, true>;
  return new EncryptionService(config);
}

function tamper(payload: string, index: number): string {
  const parts = payload.split('.');
  const bytes = Buffer.from(parts[index], 'base64url');
  bytes[0] ^= 0xff;
  parts[index] = bytes.toString('base64url');
  return parts.join('.');
}

describe('EncryptionService', () => {
  const service = serviceWith([[1, KEY_1]]);

  describe('encrypt / decrypt', () => {
    it.each(['ana.garcia@ejemplo.com', 'Peñón de Ñuñoa 🍷', ''])(
      'should round-trip %p',
      (plaintext) => {
        const payload = service.encrypt(plaintext, CONTEXT);

        expect(service.decrypt(payload, CONTEXT)).toBe(plaintext);
      },
    );

    it('should produce a versioned payload that does not contain the plaintext', () => {
      const payload = service.encrypt('ana.garcia@ejemplo.com', CONTEXT);

      expect(payload).toMatch(/^v1\.[\w-]+\.[\w-]+\.[\w-]+$/);
      expect(payload).not.toContain('ana');
    });

    it('should produce a different ciphertext each time for the same value', () => {
      const first = service.encrypt('Ana', CONTEXT);
      const second = service.encrypt('Ana', CONTEXT);

      expect(first).not.toBe(second);
    });

    it.each([
      ['iv', 1],
      ['auth tag', 2],
      ['ciphertext', 3],
    ])('should reject a payload with a tampered %s', (_part, index) => {
      const payload = service.encrypt('Ana', CONTEXT);

      expect(() => service.decrypt(tamper(payload, index), CONTEXT)).toThrow(
        DecryptionError,
      );
    });

    it('should reject a value moved to another field', () => {
      const payload = service.encrypt('Ana', 'users.firstName');

      expect(() => service.decrypt(payload, 'users.lastName')).toThrow(
        DecryptionError,
      );
    });

    it('should reject a value encrypted with an unknown key', () => {
      const other = serviceWith([[1, KEY_2]]);
      const payload = other.encrypt('Ana', CONTEXT);

      expect(() => service.decrypt(payload, CONTEXT)).toThrow(DecryptionError);
    });

    it.each([
      'texto-plano',
      'v1.a.b',
      'v1.a.b.c.d',
      'v0.AAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAA.AA',
      'x1.AAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAA.AA',
      'v1.AAAA.AAAAAAAAAAAAAAAAAAAAAA.AA',
      'v9.AAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAA.AA',
    ])('should reject the malformed payload %p', (payload) => {
      expect(() => service.decrypt(payload, CONTEXT)).toThrow(DecryptionError);
    });

    it('should not reveal the plaintext in the error', () => {
      const payload = tamper(service.encrypt('secreto-123', CONTEXT), 3);

      expect(() => service.decrypt(payload, CONTEXT)).toThrow(
        'No se pudo descifrar el valor',
      );
    });
  });

  describe('key rotation', () => {
    const rotated = serviceWith([
      [1, KEY_1],
      [2, KEY_2],
    ]);

    it('should encrypt with the highest key version', () => {
      expect(rotated.encrypt('Ana', CONTEXT)).toMatch(/^v2\./);
    });

    it('should still decrypt values from previous versions', () => {
      const legacy = service.encrypt('Ana', CONTEXT);

      expect(rotated.decrypt(legacy, CONTEXT)).toBe('Ana');
    });

    it('should re-encrypt old values with the current key', () => {
      const legacy = service.encrypt('Ana', CONTEXT);
      expect(rotated.needsReencryption(legacy)).toBe(true);

      const current = rotated.reencrypt(legacy, CONTEXT);

      expect(current).toMatch(/^v2\./);
      expect(rotated.needsReencryption(current)).toBe(false);
      expect(rotated.decrypt(current, CONTEXT)).toBe('Ana');
    });

    it('should fail once the old key is removed', () => {
      const legacy = service.encrypt('Ana', CONTEXT);
      const onlyNew = serviceWith([[2, KEY_2]]);

      expect(() => onlyNew.decrypt(legacy, CONTEXT)).toThrow(DecryptionError);
    });
  });

  describe('blindIndex', () => {
    it('should be deterministic for the same value and context', () => {
      expect(service.blindIndex('ana@ejemplo.com', CONTEXT)).toBe(
        service.blindIndex('ana@ejemplo.com', CONTEXT),
      );
    });

    it('should differ between values, contexts and keys', () => {
      const base = service.blindIndex('ana@ejemplo.com', CONTEXT);

      expect(service.blindIndex('ana2@ejemplo.com', CONTEXT)).not.toBe(base);
      expect(service.blindIndex('ana@ejemplo.com', 'quotes.email')).not.toBe(
        base,
      );
      expect(
        serviceWith([[1, KEY_1]], randomBytes(32)).blindIndex(
          'ana@ejemplo.com',
          CONTEXT,
        ),
      ).not.toBe(base);
    });

    it('should not be affected by the encryption key version', () => {
      const rotated = serviceWith([
        [1, KEY_1],
        [2, KEY_2],
      ]);

      expect(rotated.blindIndex('ana@ejemplo.com', CONTEXT)).toBe(
        service.blindIndex('ana@ejemplo.com', CONTEXT),
      );
    });
  });
});
