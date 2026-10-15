import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { EncryptionService } from '../common/crypto/encryption.service';
import { PrismaService } from '../prisma/prisma.service';

const BATCH = 100;
const USER_FIELDS = {
  emailEnc: 'users.email',
  firstNameEnc: 'users.firstName',
  lastNameEnc: 'users.lastName',
} as const;

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const prisma = app.get(PrismaService);
  const encryption = app.get(EncryptionService);
  let updated = 0;
  let cursor: string | undefined;

  try {
    for (;;) {
      const users = await prisma.user.findMany({
        take: BATCH,
        orderBy: { id: 'asc' },
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        select: {
          id: true,
          emailEnc: true,
          firstNameEnc: true,
          lastNameEnc: true,
        },
      });
      if (users.length === 0) {
        break;
      }

      for (const user of users) {
        const data: Partial<Record<keyof typeof USER_FIELDS, string>> = {};
        for (const [field, context] of Object.entries(USER_FIELDS)) {
          const value = user[field as keyof typeof USER_FIELDS];
          if (encryption.needsReencryption(value)) {
            data[field as keyof typeof USER_FIELDS] = encryption.reencrypt(
              value,
              context,
            );
          }
        }
        if (Object.keys(data).length > 0) {
          await prisma.user.update({ where: { id: user.id }, data });
          updated++;
        }
      }
      cursor = users[users.length - 1].id;
    }
    console.log(`Usuarios re-cifrados con la llave actual: ${updated}`);
  } finally {
    await app.close();
  }
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
