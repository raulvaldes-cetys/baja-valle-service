import { BadRequestException } from '@nestjs/common';
import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();
  const password = 'viñedo-Ensenada-2026';

  describe('hash / verify', () => {
    it('should produce an argon2id PHC string with OWASP parameters', async () => {
      const hash = await service.hash(password);

      expect(hash).toMatch(
        /^\$argon2id\$v=19\$m=19456,t=2,p=1\$[A-Za-z0-9+/]{22}\$[A-Za-z0-9+/]{43}$/,
      );
      expect(hash).not.toContain(password);
    });

    it('should verify the right password and reject a wrong one', async () => {
      const hash = await service.hash(password);

      await expect(service.verify(hash, password)).resolves.toBe(true);
      await expect(service.verify(hash, `${password}x`)).resolves.toBe(false);
    });

    it('should salt every hash', async () => {
      expect(await service.hash(password)).not.toBe(
        await service.hash(password),
      );
    });

    it.each([
      '',
      'texto-plano',
      '$argon2i$v=19$m=19456,t=2,p=1$c2FsdHNhbHRzYWx0c2FsdA$aGFzaA',
      '$argon2id$v=19$m=99999999,t=2,p=1$c2FsdHNhbHRzYWx0c2FsdA$aGFzaA',
    ])('should reject the malformed hash %p without throwing', async (hash) => {
      await expect(service.verify(hash, password)).resolves.toBe(false);
    });

    it('should complete a dummy verification for unknown users', async () => {
      await expect(
        service.verifyAgainstDummy(password),
      ).resolves.toBeUndefined();
    });
  });

  describe('needsRehash', () => {
    it('should not flag hashes with the current parameters', async () => {
      expect(service.needsRehash(await service.hash(password))).toBe(false);
    });

    it('should flag hashes with weaker parameters', () => {
      expect(
        service.needsRehash(
          '$argon2id$v=19$m=4096,t=1,p=1$c2FsdHNhbHRzYWx0c2FsdA$aGFzaGhhc2hoYXNoaGFzaA',
        ),
      ).toBe(true);
    });
  });

  describe('assertAcceptable', () => {
    it('should accept a strong password', () => {
      expect(() =>
        service.assertAcceptable(password, 'ana.garcia@ejemplo.com'),
      ).not.toThrow();
    });

    it.each(['1234567890', 'Password123', 'QWERTYUIOP'])(
      'should reject the common password %p',
      (common) => {
        expect(() => service.assertAcceptable(common)).toThrow(
          BadRequestException,
        );
      },
    );

    it('should reject a password containing the email user', () => {
      expect(() =>
        service.assertAcceptable('ana.garcia-2026!', 'ana.garcia@ejemplo.com'),
      ).toThrow('La contraseña no puede contener tu correo');
    });

    it('should ignore very short email users', () => {
      expect(() =>
        service.assertAcceptable(password, 'vi@ejemplo.com'),
      ).not.toThrow();
    });
  });
});
