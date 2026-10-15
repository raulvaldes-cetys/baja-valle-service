import { ConflictException, Injectable } from '@nestjs/common';
import { EncryptionService } from '../common/crypto/encryption.service';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

const FIELD = {
  email: 'users.email',
  firstName: 'users.firstName',
  lastName: 'users.lastName',
} as const;

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  createdAt: Date;
}

interface StoredUser {
  id: string;
  emailEnc: string;
  firstNameEnc: string;
  lastNameEnc: string;
  role: Role;
  createdAt: Date;
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

const isUniqueViolation = (error: unknown) =>
  (error as { code?: string }).code === 'P2002';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { emailHash: this.emailHash(email) },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(data: {
    email: string;
    firstName: string;
    lastName: string;
    passwordHash: string;
    role?: Role;
  }) {
    try {
      return await this.prisma.user.create({
        data: {
          ...this.encryptEmail(data.email),
          firstNameEnc: this.encryption.encrypt(
            data.firstName,
            FIELD.firstName,
          ),
          lastNameEnc: this.encryption.encrypt(data.lastName, FIELD.lastName),
          passwordHash: data.passwordHash,
          role: data.role ?? Role.CLIENT,
        },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Ya existe una cuenta con ese correo');
      }
      throw error;
    }
  }

  toProfile(user: StoredUser): UserProfile {
    return {
      id: user.id,
      email: this.encryption.decrypt(user.emailEnc, FIELD.email),
      firstName: this.encryption.decrypt(user.firstNameEnc, FIELD.firstName),
      lastName: this.encryption.decrypt(user.lastNameEnc, FIELD.lastName),
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  updateName(id: string, names: { firstName?: string; lastName?: string }) {
    return this.prisma.user.update({
      where: { id },
      data: {
        firstNameEnc:
          names.firstName &&
          this.encryption.encrypt(names.firstName, FIELD.firstName),
        lastNameEnc:
          names.lastName &&
          this.encryption.encrypt(names.lastName, FIELD.lastName),
      },
    });
  }

  async updateEmail(id: string, email: string) {
    try {
      return await this.prisma.user.update({
        where: { id },
        data: this.encryptEmail(email),
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Ya existe una cuenta con ese correo');
      }
      throw error;
    }
  }

  updatePasswordHash(id: string, passwordHash: string) {
    return this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  updateRole(id: string, role: Role) {
    return this.prisma.user.update({ where: { id }, data: { role } });
  }

  recordFailedLogin(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { failedLoginAttempts: { increment: 1 } },
    });
  }

  lock(id: string, until: Date) {
    return this.prisma.user.update({
      where: { id },
      data: { failedLoginAttempts: 0, lockedUntil: until },
    });
  }

  clearFailedLogins(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }

  private emailHash(email: string): string {
    return this.encryption.blindIndex(normalizeEmail(email), FIELD.email);
  }

  private encryptEmail(email: string) {
    const normalized = normalizeEmail(email);
    return {
      emailHash: this.encryption.blindIndex(normalized, FIELD.email),
      emailEnc: this.encryption.encrypt(normalized, FIELD.email),
    };
  }
}
