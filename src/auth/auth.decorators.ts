import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { Role } from '../generated/prisma/enums';
import { AuthenticatedRequest, AuthUser } from './auth.types';

export const IS_PUBLIC = 'isPublic';
export const ROLES = 'roles';
export const IGNORE_ACCESS_TOKEN = 'ignoreAccessToken';

export const Public = () => SetMetadata(IS_PUBLIC, true);

// Para /auth/refresh, que se llama justo cuando el access token ya venció
export const IgnoreAccessToken = () => SetMetadata(IGNORE_ACCESS_TOKEN, true);

export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user!,
);
