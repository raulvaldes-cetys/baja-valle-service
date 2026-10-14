import { BadRequestException, Injectable } from '@nestjs/common';
import { argon2, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';

const argon2Async = promisify(argon2);

// Mínimos de OWASP para argon2id
const PARAMS = { memory: 19_456, passes: 2, parallelism: 1 };
const VERSION = 19;
const SALT_BYTES = 16;
const HASH_BYTES = 32;
const MAX_MEMORY = 1 << 20;
const MIN_EMAIL_PART = 4;

const PHC_FORMAT =
  /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/;

// Contraseñas de 10+ caracteres de SecLists (xato-net 100k, licencia MIT), en minúsculas
const COMMON_PASSWORDS = new Set(
  readFileSync(join(__dirname, 'common-passwords.txt'), 'utf8').split('\n'),
);

interface Argon2Params {
  memory: number;
  passes: number;
  parallelism: number;
}

const toPhcBase64 = (bytes: Buffer) =>
  bytes.toString('base64').replace(/=+$/, '');

@Injectable()
export class PasswordService {
  private dummyHash?: Promise<string>;

  async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_BYTES);
    const hash = await this.derive(password, salt, PARAMS);
    return `$argon2id$v=${VERSION}$m=${PARAMS.memory},t=${PARAMS.passes},p=${PARAMS.parallelism}$${toPhcBase64(salt)}$${toPhcBase64(hash)}`;
  }

  async verify(storedHash: string, password: string): Promise<boolean> {
    const parsed = this.parse(storedHash);
    if (!parsed) {
      return false;
    }

    const candidate = await this.derive(password, parsed.salt, parsed.params);
    return (
      candidate.length === parsed.hash.length &&
      timingSafeEqual(candidate, parsed.hash)
    );
  }

  /** Iguala el tiempo de respuesta cuando el usuario no existe. */
  async verifyAgainstDummy(password: string): Promise<void> {
    this.dummyHash ??= this.hash(randomBytes(32).toString('base64'));
    await this.verify(await this.dummyHash, password);
  }

  needsRehash(storedHash: string): boolean {
    const parsed = this.parse(storedHash);
    return (
      !parsed ||
      parsed.params.memory < PARAMS.memory ||
      parsed.params.passes < PARAMS.passes ||
      parsed.params.parallelism < PARAMS.parallelism
    );
  }

  assertAcceptable(password: string, email?: string): void {
    const normalized = password.toLowerCase();

    if (COMMON_PASSWORDS.has(normalized)) {
      throw new BadRequestException(
        'La contraseña es demasiado común; elige otra',
      );
    }
    const localPart = email?.split('@')[0].toLowerCase() ?? '';
    if (localPart.length >= MIN_EMAIL_PART && normalized.includes(localPart)) {
      throw new BadRequestException(
        'La contraseña no puede contener tu correo',
      );
    }
  }

  private derive(
    password: string,
    salt: Buffer,
    params: Argon2Params,
  ): Promise<Buffer> {
    return argon2Async('argon2id', {
      message: password,
      nonce: salt,
      tagLength: HASH_BYTES,
      ...params,
    });
  }

  private parse(
    storedHash: string,
  ): { params: Argon2Params; salt: Buffer; hash: Buffer } | undefined {
    const match = PHC_FORMAT.exec(storedHash);
    if (!match) {
      return undefined;
    }

    const params = {
      memory: Number(match[1]),
      passes: Number(match[2]),
      parallelism: Number(match[3]),
    };
    if (
      params.memory > MAX_MEMORY ||
      params.passes < 1 ||
      params.parallelism < 1
    ) {
      return undefined;
    }

    return {
      params,
      salt: Buffer.from(match[4], 'base64'),
      hash: Buffer.from(match[5], 'base64'),
    };
  }
}
