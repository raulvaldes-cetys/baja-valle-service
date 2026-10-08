# Baja Valle Service

API REST de Baja Valle: catálogo de productos y categorías, y envío de formularios de contacto y cotización por correo.

**Stack:** NestJS 11 · Prisma 7 (PostgreSQL) · nodemailer · exceljs · pnpm

## Requisitos

- Node.js 22
- pnpm (versión fijada en `packageManager`; con `corepack enable` se usa la correcta)
- Docker (Postgres local)
- [gitleaks](https://github.com/gitleaks/gitleaks#installing): **obligatorio**, el hook de pre-commit no deja hacer commit sin él
  - macOS: `brew install gitleaks`
  - Windows: `winget install gitleaks`

## Configuración local

```bash
corepack enable
pnpm install                # también instala el hook de pre-commit (husky)
cp .env.example .env        # apunta a la BD local; completa las variables MAIL_*
pnpm db:up                  # Postgres 17 en 127.0.0.1:5432
pnpm db:migrate             # migraciones + permisos y RLS (prisma/sql/grants.sql)
pnpm start:dev
```

- API: http://localhost:3000
- Documentación (Swagger): http://localhost:3000/docs (solo con `SWAGGER_ENABLED=true`, que viene en `.env.example`; apagada por defecto)

Si falta una variable de entorno o tiene un formato inválido, la API no arranca y muestra cuál es (ver `src/config/env.ts`).

## Scripts

| Script | Qué hace |
|---|---|
| `pnpm start:dev` | API en modo watch |
| `pnpm db:up` / `pnpm db:down` | Levanta / detiene el Postgres local |
| `pnpm db:migrate` | `prisma migrate deploy` + `pnpm db:grants` |
| `pnpm db:grants` | Aplica permisos de mínimo privilegio y RLS (idempotente) |
| `pnpm lint:check` / `pnpm typecheck` | Verificaciones sin modificar archivos (las mismas del CI) |
| `pnpm test` / `pnpm test:e2e` | Pruebas unitarias / end-to-end |

## Seguridad

### Base de datos: mínimo privilegio

| Rol | Variable | Permisos |
|---|---|---|
| `baja_valle_migrator` | `DIRECT_URL` | Dueño del esquema; solo para migraciones |
| `baja_valle_app` | `DATABASE_URL` | Solo `SELECT/INSERT/UPDATE/DELETE`; sin DDL ni acceso a `_prisma_migrations` |

Todas las tablas tienen **RLS** activado con una política solo para `baja_valle_app`. En Supabase esto bloquea el acceso directo por la Data API (roles `anon`/`authenticated`).

Después de **cada** migración hay que correr `pnpm db:grants` (o usar `pnpm db:migrate`, que ya lo incluye).

Para una BD administrada (Supabase hoy, Azure después):

1. Crear el rol de la app una vez: `prisma/sql/create-app-role.sql`, con una contraseña generada.
2. `pnpm db:grants`.
3. **Solo Supabase:** `prisma/sql/supabase-lockdown.sql`. Revoca todos los privilegios de `anon` y `authenticated`, incluido `TRUNCATE`, que RLS no controla.
4. Usar el rol de la app en `DATABASE_URL`. En el pooler de Supabase el usuario lleva el ref del proyecto: `baja_valle_app.<project-ref>`.

> Si la red bloquea Postgres (por ejemplo, el firewall de la escuela), los pasos 1–3 se pueden pegar en el SQL Editor de Supabase, que funciona por HTTPS.

### Políticas verificadas automáticamente

- **Secretos:** gitleaks en pre-commit y en CI. Los falsos positivos revisados van en `.gitleaksignore`.
- **SQL Injection:** ESLint prohíbe `$queryRawUnsafe` y `$executeRawUnsafe`. Para SQL crudo usa `` $queryRaw`...` `` con parámetros.
- **Dependencias:** `pnpm audit --audit-level high` en CI y Dependabot semanal. Las excepciones aceptadas están documentadas en `pnpm-workspace.yaml` (`auditConfig.ignoreGhsas`).
- **HTTP:** headers de seguridad (helmet), CORS solo para `CORS_ORIGINS`, límite de body de 100 kb y validación estricta de DTOs e ids.
