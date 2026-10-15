import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PASSWORD_MAX, PASSWORD_MIN } from '../auth/dto/auth.dto';
import { PasswordService } from '../auth/password.service';
import { Role } from '../generated/prisma/enums';
import { UsersService } from '../users/users.service';

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email) {
    throw new Error('Define SEED_ADMIN_EMAIL');
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const users = app.get(UsersService);
    const existing = await users.findByEmail(email);

    if (existing) {
      await users.updateRole(existing.id, Role.ADMIN);
      console.log(`Usuario existente promovido a ADMIN: ${existing.id}`);
      return;
    }

    if (
      !password ||
      password.length < PASSWORD_MIN ||
      password.length > PASSWORD_MAX
    ) {
      throw new Error(
        `Define SEED_ADMIN_PASSWORD (${PASSWORD_MIN}-${PASSWORD_MAX} caracteres)`,
      );
    }
    const passwords = app.get(PasswordService);
    passwords.assertAcceptable(password, email);

    const admin = await users.create({
      email,
      firstName: process.env.SEED_ADMIN_FIRST_NAME ?? 'Admin',
      lastName: process.env.SEED_ADMIN_LAST_NAME ?? 'Baja Valle',
      passwordHash: await passwords.hash(password),
      role: Role.ADMIN,
    });
    console.log(`Admin creado: ${admin.id}`);
  } finally {
    await app.close();
  }
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
