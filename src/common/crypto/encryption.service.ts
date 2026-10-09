import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from 'node:crypto';
import { Env } from '../../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;
const ENCODING = 'base64url';

export class DecryptionError extends Error {
  constructor() {
    super('No se pudo descifrar el valor');
    this.name = 'DecryptionError';
  }
}

/**
 * `context` identifica el campo (p. ej. "users.email") y se autentica como AAD:
 * un valor cifrado copiado a otra columna no se puede descifrar.
 */
@Injectable()
export class EncryptionService {
  private readonly keys: Map<number, Buffer>;
  private readonly currentVersion: number;
  private readonly blindIndexKey: Buffer;

  constructor(config: ConfigService<Env, true>) {
    this.keys = config.get('ENCRYPTION_KEYS', { infer: true });
    this.currentVersion = Math.max(...this.keys.keys());
    this.blindIndexKey = config.get('BLIND_INDEX_KEY', { infer: true });
  }

  encrypt(plaintext: string, context: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(
      ALGORITHM,
      this.keys.get(this.currentVersion)!,
      iv,
      { authTagLength: TAG_BYTES },
    );
    cipher.setAAD(Buffer.from(context, 'utf8'));

    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    return [
      `v${this.currentVersion}`,
      iv.toString(ENCODING),
      cipher.getAuthTag().toString(ENCODING),
      ciphertext.toString(ENCODING),
    ].join('.');
  }

  decrypt(payload: string, context: string): string {
    const [version, iv, tag, ciphertext] = this.parse(payload);
    const key = this.keys.get(version);
    if (!key) {
      throw new DecryptionError();
    }

    try {
      const decipher = createDecipheriv(ALGORITHM, key, iv, {
        authTagLength: TAG_BYTES,
      });
      decipher.setAAD(Buffer.from(context, 'utf8'));
      decipher.setAuthTag(tag);

      return Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      throw new DecryptionError();
    }
  }

  needsReencryption(payload: string): boolean {
    return this.parse(payload)[0] !== this.currentVersion;
  }

  reencrypt(payload: string, context: string): string {
    return this.encrypt(this.decrypt(payload, context), context);
  }

  /** HMAC determinista para buscar por igualdad sin guardar el valor en claro. */
  blindIndex(value: string, context: string): string {
    return createHmac('sha256', this.blindIndexKey)
      .update(context)
      .update('\0')
      .update(value)
      .digest(ENCODING);
  }

  private parse(payload: string): [number, Buffer, Buffer, Buffer] {
    const parts = payload.split('.');
    const version = /^v([1-9]\d*)$/.exec(parts[0] ?? '');

    if (parts.length !== 4 || !version) {
      throw new DecryptionError();
    }

    const [iv, tag, ciphertext] = parts
      .slice(1)
      .map((part) => Buffer.from(part, ENCODING));
    if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
      throw new DecryptionError();
    }

    return [Number(version[1]), iv, tag, ciphertext];
  }
}
