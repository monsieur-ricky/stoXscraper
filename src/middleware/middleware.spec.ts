import { ForbiddenException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiKeyMiddleware } from './api-key.middleware';
import { DomainRestrictionMiddleware } from './domain-restriction.middleware';

describe('optional API key middleware', () => {
  const original = process.env.API_KEY;
  afterEach(() => {
    if (original === undefined) delete process.env.API_KEY;
    else process.env.API_KEY = original;
  });
  it.each([undefined, '', 'wrong', ['secret', 'secret']])(
    'rejects invalid key %s',
    (key) => {
      process.env.API_KEY = 'secret';
      const next = jest.fn();
      expect(() =>
        new ApiKeyMiddleware().use(
          { headers: { 'stoxscraper-api-key': key } } as unknown as Request,
          {} as Response,
          next,
        ),
      ).toThrow(ForbiddenException);
      expect(next).not.toHaveBeenCalled();
    },
  );
  it('fails closed when no API key is configured', () => {
    delete process.env.API_KEY;
    expect(() =>
      new ApiKeyMiddleware().use(
        { headers: {} } as Request,
        {} as Response,
        jest.fn(),
      ),
    ).toThrow(ForbiddenException);
  });
  it('accepts the configured key', () => {
    process.env.API_KEY = 'secret';
    const next = jest.fn();
    new ApiKeyMiddleware().use(
      { headers: { 'stoxscraper-api-key': 'secret' } } as unknown as Request,
      {} as Response,
      next,
    );
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('optional domain restriction middleware', () => {
  it.each([
    'https://your-domain.com',
    'http://localhost:3000/path',
    'https://YOUR-DOMAIN.COM',
  ])('accepts exact allowed hosts: %s', (origin) => {
    const next = jest.fn();
    new DomainRestrictionMiddleware().use(
      { headers: { origin } } as Request,
      {} as Response,
      next,
    );
    expect(next).toHaveBeenCalledTimes(1);
  });
  it('supports a referer when origin is absent', () => {
    const next = jest.fn();
    new DomainRestrictionMiddleware().use(
      { headers: { referer: 'https://your-domain.com/path' } } as Request,
      {} as Response,
      next,
    );
    expect(next).toHaveBeenCalledTimes(1);
  });
  it.each([
    undefined,
    'not a URL',
    'https://your-domain.com.evil.test',
    'https://evil.test/your-domain.com',
    'https://your-domain.com@evil.test',
    'https://evil.test/?localhost',
    'file://localhost/path',
    'https://user@your-domain.com',
  ])('rejects missing, malformed, or spoofed origin %s', (origin) => {
    const next = jest.fn();
    expect(() =>
      new DomainRestrictionMiddleware().use(
        { headers: { origin } } as Request,
        {} as Response,
        next,
      ),
    ).toThrow(ForbiddenException);
    expect(next).not.toHaveBeenCalled();
  });
});
