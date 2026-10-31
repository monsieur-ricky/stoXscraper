function integerSetting(
  name: string,
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  if (value === undefined) return fallback;
  const number = Number(value);
  if (
    String(value).trim() === '' ||
    !Number.isSafeInteger(number) ||
    number < min ||
    number > max
  ) {
    throw new Error(`${name} must be an integer between ${min} and ${max}.`);
  }
  return number;
}

export function validateEnvironment(env: Record<string, unknown>) {
  return {
    ...env,
    PORT: integerSetting('PORT', env.PORT, 3000, 1, 65535),
    CACHE_TTL: integerSetting(
      'CACHE_TTL',
      env.CACHE_TTL,
      60000,
      0,
      Number.MAX_SAFE_INTEGER,
    ),
  };
}
