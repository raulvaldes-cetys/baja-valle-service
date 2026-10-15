import { Request } from 'express';
import { Role } from '../generated/prisma/enums';

export interface AuthUser {
  id: string;
  role: Role;
  sessionId: string;
}

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  sid: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

export type AuthenticatedRequest = Request & { user?: AuthUser };
