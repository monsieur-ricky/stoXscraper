import { Test, TestingModule } from '@nestjs/testing';
import { BadGatewayException } from '@nestjs/common';
import {
  GOLD_API_CLOCK,
  GOLD_API_FETCH,
  GoldApiService,
} from './gold-api.service';
import { goldApiHarness } from '../../test/gold-api-harness';
import { metalQuoteData } from '../../test/fixtures';

describe('Gold-API provider integration (HTTP/time boundaries only)', () => {
  let module: TestingModule;
  let service: GoldApiService;
  let upstream: ReturnType<typeof goldApiHarness>;

  beforeEach(async () => {
    upstream = goldApiHarness();
    module = await Test.createTestingModule({
      providers: [
        GoldApiService,
        { provide: GOLD_API_FETCH, useValue: upstream.fetch },
        { provide: GOLD_API_CLOCK, useValue: upstream.clock },
      ],
    }).compile();
    service = module.get(GoldApiService);
  });

  afterEach(async () => {
    await module.close();
  });

  it.each([
    ['gold', 2200.75, 2000.5, 1700.25],
    ['silver', 33.75, 30.5, 25.25],
  ] as const)(
    'preserves every public %s response field using spot quotes',
    async (metal, usd, eur, gbp) => {
      await expect(service.getQuote(metal)).resolves.toEqual({
        metal,
        pricePerOunceDollar: usd,
        pricePerOunceEuro: eur,
        pricePerOuncePound: gbp,
        pricePerGramDollar: Math.round((usd / 31.1035) * 100) / 100,
        pricePerGramEuro: Math.round((eur / 31.1035) * 100) / 100,
        pricePerGramPound: Math.round((gbp / 31.1035) * 100) / 100,
      });
      for (const [, options] of upstream.fetch.mock.calls) {
        expect(options).toEqual({
          headers: { Accept: 'application/json' },
          redirect: 'error',
          signal: expect.any(AbortSignal),
        });
        expect(options?.signal?.aborted).toBe(false);
      }
    },
  );

  it('sets a ten-second deadline and does not retry automatically on timeout', async () => {
    const timeout = jest.spyOn(AbortSignal, 'timeout');
    try {
      upstream.fetch.mockRejectedValueOnce(
        new DOMException('Timeout', 'TimeoutError'),
      );
      await expect(service.getQuote('gold')).rejects.toThrow(
        BadGatewayException,
      );
      await service.getQuote('gold');
      expect(upstream.fetch).toHaveBeenCalledTimes(4);
      expect(timeout).toHaveBeenCalledWith(10000);
    } finally {
      timeout.mockRestore();
    }
  });

  it('spaces every upstream call by at least 1.1 seconds across both metals', async () => {
    await Promise.all([service.getQuote('gold'), service.getQuote('silver')]);
    expect(upstream.startedAt).toHaveLength(6);
    for (let i = 1; i < upstream.startedAt.length; i++) {
      expect(
        upstream.startedAt[i] - upstream.startedAt[i - 1],
      ).toBeGreaterThanOrEqual(1100);
    }
  });

  it('shares pending requests for simultaneous callers instead of sending bursts', async () => {
    const [first, second, silver, duplicateSilver] = await Promise.all([
      service.getQuote('gold'),
      service.getQuote('gold'),
      service.getQuote('silver'),
      service.getQuote('silver'),
    ]);
    expect(second).toEqual(first);
    expect(duplicateSilver).toEqual(silver);
    expect(upstream.fetch).toHaveBeenCalledTimes(6);
  });

  it('reuses fresh provider quotes independently of the HTTP response cache', async () => {
    const first = await service.getQuote('gold');
    expect(await service.getQuote('gold')).toEqual(first);
    upstream.advance(20000);
    expect(await service.getQuote('gold')).toEqual(first);
    expect(upstream.fetch).toHaveBeenCalledTimes(3);
  });

  it('refreshes expired quotes instead of serving stale provider-cache entries', async () => {
    await service.getQuote('silver');
    upstream.advance(30000);
    await service.getQuote('silver');
    expect(upstream.fetch).toHaveBeenCalledTimes(6);
  });

  it.each([301, 401, 403, 500, 503])(
    'maps upstream HTTP %s to 502, then recovers on a new request',
    async (status) => {
      upstream.fetch.mockResolvedValueOnce(
        new Response('upstream rejected', { status }),
      );
      await expect(service.getQuote('gold')).rejects.toThrow(
        BadGatewayException,
      );
      await expect(service.getQuote('gold')).resolves.toMatchObject({
        pricePerOunceDollar: 2200.75,
      });
      expect(upstream.fetch).toHaveBeenCalledTimes(4);
    },
  );

  it('rejects HTML or malformed JSON instead of parsing arbitrary markup', async () => {
    upstream.fetch.mockResolvedValueOnce(
      new Response('<html>Challenge</html>'),
    );
    await expect(service.getQuote('gold')).rejects.toThrow(
      'Gold-API spot price request failed.',
    );
  });

  it('cancels unsuccessful HTTP response bodies to release the connection', async () => {
    const response = new Response('Unavailable', { status: 503 });
    const cancel = jest.spyOn(response.body!, 'cancel');
    upstream.fetch.mockResolvedValueOnce(response);
    await expect(service.getQuote('gold')).rejects.toThrow(BadGatewayException);
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('handles empty upstream error bodies', async () => {
    upstream.fetch.mockResolvedValueOnce(new Response(null, { status: 503 }));
    await expect(service.getQuote('silver')).rejects.toThrow(
      BadGatewayException,
    );
  });

  it.each([null, [], 'not an object', {}, { symbol: 'XAU', currency: 'USD' }])(
    'rejects missing or invalid quote structure: %j',
    async (payload) => {
      upstream.fetch.mockResolvedValueOnce(Response.json(payload));
      await expect(service.getQuote('gold')).rejects.toThrow(
        BadGatewayException,
      );
    },
  );

  it.each([
    0,
    -1,
    '123',
    null,
    undefined,
    Infinity,
    NaN,
    Number.MAX_SAFE_INTEGER + 1,
    1e308,
  ])('rejects nonpositive or nonnumeric price: %s', async (price) => {
    const payload = {
      ...metalQuoteData('XAU', 'USD', upstream.clock.now()),
      price,
    };
    upstream.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => payload,
    } as Response);
    await expect(service.getQuote('gold')).rejects.toThrow(BadGatewayException);
  });

  it.each([
    { symbol: 'XAG' },
    { symbol: 'GC=F' },
    { currency: 'EUR' },
    { currency: undefined },
    { updatedAt: undefined },
    { updatedAt: 'invalid-date' },
  ])(
    'rejects mismatched identity/currency or missing timestamp: %j',
    async (overrides) => {
      const payload = {
        ...metalQuoteData('XAU', 'USD', upstream.clock.now()),
        ...overrides,
      };
      upstream.fetch.mockResolvedValueOnce(Response.json(payload));
      await expect(service.getQuote('gold')).rejects.toThrow(
        BadGatewayException,
      );
    },
  );

  it.each([-300001, 60001])(
    'rejects stale or implausibly future source timestamps (%s ms)',
    async (offset) => {
      const payload = metalQuoteData(
        'XAU',
        'USD',
        upstream.clock.now() + offset,
      );
      upstream.fetch.mockResolvedValueOnce(Response.json(payload));
      await expect(service.getQuote('gold')).rejects.toThrow(
        BadGatewayException,
      );
    },
  );

  it('never silently substitutes a USD price when a requested currency fails', async () => {
    upstream.fetch.mockImplementation(async (url) => {
      const [, symbol, currency] = new URL(String(url)).pathname
        .split('/')
        .slice(1);
      if (currency === 'GBP')
        return new Response('Unavailable', { status: 503 });
      return Response.json(
        metalQuoteData(symbol, currency, upstream.clock.now()),
      );
    });
    await expect(service.getQuote('silver')).rejects.toThrow(
      BadGatewayException,
    );
  });

  it.each(['60', 'date', null, 'invalid', '0', 'Infinity'])(
    'honors rate-limit cooldowns and Retry-After (%s)',
    async (header) => {
      const value =
        header === 'date'
          ? new Date(upstream.clock.now() + 60000).toUTCString()
          : header;
      upstream.fetch.mockResolvedValueOnce(
        new Response('Rate limited', {
          status: 429,
          headers: value === null ? {} : { 'Retry-After': value },
        }),
      );
      await expect(service.getQuote('gold')).rejects.toThrow(
        BadGatewayException,
      );
      // Drain queued virtual-time requests; they must fail without any upstream traffic.
      await new Promise<void>((resolve) => setImmediate(resolve));
      await expect(service.getQuote('silver')).rejects.toThrow(
        BadGatewayException,
      );
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(upstream.fetch).toHaveBeenCalledTimes(1);
      upstream.advance(61000);
      await expect(service.getQuote('gold')).resolves.toMatchObject({
        pricePerOunceDollar: 2200.75,
      });
      expect(upstream.fetch).toHaveBeenCalledTimes(4);
    },
  );
});
