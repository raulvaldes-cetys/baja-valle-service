import { ExecutionContext } from '@nestjs/common';
import {
  buildThrottlers,
  RateLimit,
  RateLimitPolicy,
} from './rate-limit.policies';

const env = {
  THROTTLE_GLOBAL_PER_MINUTE: 100,
  THROTTLE_FORM_PER_MINUTE: 3,
  THROTTLE_FORM_PER_DAY: 20,
  THROTTLE_AUTH_PER_MINUTE: 5,
  THROTTLE_REFRESH_PER_MINUTE: 20,
  THROTTLE_PROFILE_PER_15_MINUTES: 5,
};

function contextFor(policy?: RateLimitPolicy): ExecutionContext {
  class TestController {}
  const handler = () => undefined;
  if (policy) {
    RateLimit(policy)(TestController);
  }
  return {
    getHandler: () => handler,
    getClass: () => TestController,
  } as unknown as ExecutionContext;
}

describe('buildThrottlers', () => {
  const throttlers = buildThrottlers(env);
  const byName = (name: string) => throttlers.find((t) => t.name === name)!;
  const appliesTo = (name: string, policy?: RateLimitPolicy) =>
    !byName(name).skipIf?.(contextFor(policy));

  it('should define the limits from the plan', () => {
    expect(
      throttlers.map(({ name, ttl, limit }) => ({ name, ttl, limit })),
    ).toEqual([
      { name: 'global', ttl: 60_000, limit: 100 },
      { name: 'form-minute', ttl: 60_000, limit: 3 },
      { name: 'form-day', ttl: 86_400_000, limit: 20 },
      { name: 'auth', ttl: 60_000, limit: 5 },
      { name: 'refresh', ttl: 60_000, limit: 20 },
      { name: 'profile', ttl: 900_000, limit: 5 },
    ]);
  });

  it('should apply the global limit to every route', () => {
    expect(appliesTo('global')).toBe(true);
    expect(appliesTo('global', 'form')).toBe(true);
  });

  it('should apply both form limits only to routes with the form policy', () => {
    expect(appliesTo('form-minute', 'form')).toBe(true);
    expect(appliesTo('form-day', 'form')).toBe(true);
    expect(appliesTo('form-minute')).toBe(false);
    expect(appliesTo('form-day', 'auth')).toBe(false);
  });

  it.each(['auth', 'refresh', 'profile'] as const)(
    'should apply the %s limit only to its own policy',
    (policy) => {
      expect(appliesTo(policy, policy)).toBe(true);
      expect(appliesTo(policy)).toBe(false);
      expect(appliesTo(policy, 'form')).toBe(false);
    },
  );
});
