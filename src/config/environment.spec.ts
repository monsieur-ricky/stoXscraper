import { validateEnvironment } from './environment';

describe('environment validation', () => {
  it('uses finite numeric defaults', () => {
    expect(validateEnvironment({})).toEqual({ PORT: 3000, CACHE_TTL: 60000 });
  });
  it('converts valid configuration and preserves unrelated values', () => {
    expect(
      validateEnvironment({ PORT: '8080', CACHE_TTL: '0', API_KEY: 'example' }),
    ).toEqual({ PORT: 8080, CACHE_TTL: 0, API_KEY: 'example' });
  });
  it.each([
    '',
    ' ',
    'NaN',
    'Infinity',
    '-1',
    '1.5',
    String(Number.MAX_SAFE_INTEGER + 1),
  ])('rejects invalid cache TTL %s', (CACHE_TTL) => {
    expect(() => validateEnvironment({ CACHE_TTL })).toThrow('CACHE_TTL');
  });
  it.each(['0', '-1', '65536', 'http', '3.5', ''])(
    'rejects invalid port %s',
    (PORT) => {
      expect(() => validateEnvironment({ PORT })).toThrow('PORT');
    },
  );
});
