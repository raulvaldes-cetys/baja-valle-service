import { ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerOptions } from '@nestjs/throttler';
import { Env } from '../../config/env';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const DAY = 24 * 60 * MINUTE;

export type RateLimitPolicy = 'form' | 'auth' | 'refresh' | 'profile';

const RATE_LIMIT_POLICY = 'rateLimitPolicy';
const reflector = new Reflector();

export const RateLimit = (policy: RateLimitPolicy) =>
  SetMetadata(RATE_LIMIT_POLICY, policy);

function policyOf(context: ExecutionContext): RateLimitPolicy | undefined {
  return reflector.getAllAndOverride<RateLimitPolicy | undefined>(
    RATE_LIMIT_POLICY,
    [context.getHandler(), context.getClass()],
  );
}

type RateLimitEnv = Pick<
  Env,
  | 'THROTTLE_GLOBAL_PER_MINUTE'
  | 'THROTTLE_FORM_PER_MINUTE'
  | 'THROTTLE_FORM_PER_DAY'
  | 'THROTTLE_AUTH_PER_MINUTE'
  | 'THROTTLE_REFRESH_PER_MINUTE'
  | 'THROTTLE_PROFILE_PER_15_MINUTES'
>;

function forPolicy(
  policy: RateLimitPolicy,
  throttler: Omit<ThrottlerOptions, 'skipIf'> & { name: string },
): ThrottlerOptions {
  return {
    ...throttler,
    skipIf: (context) => policyOf(context) !== policy,
  };
}

export function buildThrottlers(env: RateLimitEnv): ThrottlerOptions[] {
  return [
    { name: 'global', ttl: MINUTE, limit: env.THROTTLE_GLOBAL_PER_MINUTE },

    forPolicy('form', {
      name: 'form-minute',
      ttl: MINUTE,
      limit: env.THROTTLE_FORM_PER_MINUTE,
    }),
    forPolicy('form', {
      name: 'form-day',
      ttl: DAY,
      limit: env.THROTTLE_FORM_PER_DAY,
    }),

    forPolicy('auth', {
      name: 'auth',
      ttl: MINUTE,
      limit: env.THROTTLE_AUTH_PER_MINUTE,
    }),
    forPolicy('refresh', {
      name: 'refresh',
      ttl: MINUTE,
      limit: env.THROTTLE_REFRESH_PER_MINUTE,
    }),

    forPolicy('profile', {
      name: 'profile',
      ttl: 15 * MINUTE,
      limit: env.THROTTLE_PROFILE_PER_15_MINUTES,
    }),
  ];
}
