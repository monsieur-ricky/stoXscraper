import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import request from 'supertest';
import { AppModule } from './app.module';
import { BROWSER_LAUNCHER } from './utilities/playwright.service';
import { browserHarness } from '../test/browser-harness';
import { quoteHtml } from '../test/fixtures';
import { ConfigService } from '@nestjs/config';
import { GOLD_API_CLOCK, GOLD_API_FETCH } from './asset/gold-api.service';
import { goldApiHarness } from '../test/gold-api-harness';

describe('Nest HTTP / browser adapter / parsing / cache integration (offline)', () => {
  let app: INestApplication;
  let server: Server;
  let browser: ReturnType<typeof browserHarness>;
  let goldApi: ReturnType<typeof goldApiHarness>;

  beforeEach(async () => {
    browser = browserHarness();
    goldApi = goldApiHarness();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(BROWSER_LAUNCHER)
      .useValue(browser.launcher)
      .overrideProvider(GOLD_API_FETCH)
      .useValue(goldApi.fetch)
      .overrideProvider(GOLD_API_CLOCK)
      .useValue(goldApi.clock)
      .compile();
    app = module.createNestApplication({ logger: false });
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterEach(async () => {
    await app.close();
    expect(browser.closeBrowser).toHaveBeenCalledTimes(1);
    expect(browser.closeContext).toHaveBeenCalledTimes(
      browser.newContext.mock.calls.length,
    );
  });

  it('initializes the actual module lifecycle and preserves the root greeting', async () => {
    await request(server).get('/').expect(200, 'stoXscaper API');
    expect(browser.launch).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['/asset/search/Apple', { symbol: 'AAPL', currency: 'USD' }],
    ['/asset/quote/aapl', { symbol: 'AAPL', price: 200.25 }],
    ['/asset/profile/aapl', { symbol: 'AAPL', sector: 'Technology' }],
    ['/asset/quote/metal/gold', { metal: 'gold', pricePerOunceEuro: 2000.5 }],
    ['/asset/quote/metal/SILVER', { metal: 'silver', pricePerOunceEuro: 30.5 }],
  ])('routes %s through real providers and parsers', async (url, expected) => {
    const response = await request(server).get(url).expect(200);
    expect(
      Array.isArray(response.body) ? response.body[0] : response.body,
    ).toMatchObject(expected);
  });

  it('caches successful responses by URL, including the external browser work', async () => {
    await request(server).get('/asset/search/Apple').expect(200);
    await request(server).get('/asset/search/Apple').expect(200);
    expect(browser.document).toHaveBeenCalledTimes(1);
    await request(server).get('/asset/search/Other').expect(200);
    expect(browser.document).toHaveBeenCalledTimes(2);
  });

  it('expires cache entries using millisecond TTLs', async () => {
    const cache = app.get<Cache>(CACHE_MANAGER);
    await cache.set('ttl-regression', 'value', 10);
    expect(await cache.get('ttl-regression')).toBe('value');
    // Keyv expiry uses Date.now; advance the clock without sleeping or faking HTTP timers.
    const now = jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 11);
    try {
      expect(await cache.get('ttl-regression')).toBeUndefined();
    } finally {
      now.mockRestore();
    }
  });

  it('honors the configured default TTL through the global HTTP cache interceptor', async () => {
    const ttl = app.get(ConfigService).getOrThrow<number>('CACHE_TTL');
    await request(server).get('/asset/search/default-ttl').expect(200);
    await request(server).get('/asset/search/default-ttl').expect(200);
    expect(browser.document).toHaveBeenCalledTimes(1);
    const now = jest.spyOn(Date, 'now').mockReturnValue(Date.now() + ttl + 1);
    try {
      await request(server).get('/asset/search/default-ttl').expect(200);
      expect(browser.document).toHaveBeenCalledTimes(2);
    } finally {
      now.mockRestore();
    }
  });

  it('allows absent optional quote metrics without inventing values', async () => {
    browser.document
      .mockResolvedValueOnce('<pre>crumb</pre>')
      .mockResolvedValueOnce(
        '<pre>{"quoteResponse":{"result":[{"regularMarketPrice":0,"regularMarketChange":0,"regularMarketChangePercent":0,"dividendYield":null}]}}</pre>',
      );
    const response = await request(server).get('/asset/quote/NEW').expect(200);
    expect(response.body).toEqual({
      symbol: 'NEW',
      name: 'NEW',
      price: 0,
      changeValue: 0,
      changePercent: 0,
    });
  });

  it.each(['"not-a-number"', '1e400'])(
    'rejects malformed optional numeric metrics: %s',
    async (metric) => {
      browser.document
        .mockResolvedValueOnce('<pre>crumb</pre>')
        .mockResolvedValueOnce(
          `<pre>{"quoteResponse":{"result":[{"regularMarketPrice":1,"regularMarketChange":0,"regularMarketChangePercent":0,"dividendYield":${metric}}]}}</pre>`,
        );
      await request(server).get('/asset/quote/BAD').expect(502);
    },
  );

  it('encodes ticker and crumb query components independently', async () => {
    browser.document
      .mockResolvedValueOnce('<pre>a+b/c?d=e&amp;f</pre>')
      .mockResolvedValueOnce(quoteHtml);
    await request(server).get('/asset/quote/%5EGSPC%26other%3D1').expect(200);
    expect(browser.navigation).toHaveBeenLastCalledWith(
      'https://query1.finance.yahoo.com/v7/finance/quote?symbols=%5EGSPC%26OTHER%3D1&crumb=a%2Bb%2Fc%3Fd%3De%26f',
      { waitUntil: 'load', timeout: 30000 },
    );
  });

  it('encodes search text without query parameter injection', async () => {
    await request(server).get('/asset/search/AT%26T%3Fx%3D1').expect(200);
    expect(browser.navigation).toHaveBeenCalledWith(
      'https://query2.finance.yahoo.com/v1/finance/search?q=AT%26T%3Fx%3D1',
      { waitUntil: 'load', timeout: 30000 },
    );
  });

  it.each(['platinum', '..', 'gold-price', '%20', 'x'.repeat(201)])(
    'rejects unsupported metal %s before browser work',
    async (metal) => {
      await request(server).get(`/asset/quote/metal/${metal}`).expect(400);
      expect(browser.navigation).not.toHaveBeenCalled();
      expect(goldApi.fetch).not.toHaveBeenCalled();
    },
  );

  it.each([
    '/asset/search/%20',
    '/asset/quote/%01',
    `/asset/quote/${'A'.repeat(129)}`,
  ])('rejects invalid input on %s', async (url) => {
    await request(server).get(url).expect(400);
    expect(browser.navigation).not.toHaveBeenCalled();
  });

  it.each([
    '<html>Consent required</html>',
    '<pre>not-json</pre>',
    '<pre>null</pre>',
    '<pre>{}</pre>',
    '<pre>{"quotes":[null]}</pre>',
    '<pre>{"quotes":[{}]}</pre>',
  ])('maps invalid search payload to 502: %s', async (html) => {
    browser.document.mockResolvedValue(html);
    await request(server).get('/asset/search/malformed').expect(502);
  });

  it('falls back to short name / symbol and tolerates unknown exchanges', async () => {
    browser.document.mockResolvedValue(
      '<pre>{"quotes":[{"symbol":"ONE","shortname":"Short"},{"symbol":"TWO"}]}</pre>',
    );
    const response = await request(server)
      .get('/asset/search/fallbacks')
      .expect(200);
    expect(response.body).toEqual([
      { symbol: 'ONE', name: 'Short' },
      { symbol: 'TWO', name: 'TWO' },
    ]);
  });

  it.each([
    ['missing', '<pre>{"quoteResponse":{"result":[]}}</pre>', 404],
    [
      'provider-error',
      '<pre>{"quoteResponse":{"error":{"code":"Unauthorized"}}}</pre>',
      502,
    ],
    ['malformed', '<pre>{"quoteResponse":null}</pre>', 502],
    ['price-absent', '<pre>{"quoteResponse":{"result":[{}]}}</pre>', 502],
    [
      'price-string',
      '<pre>{"quoteResponse":{"result":[{"regularMarketPrice":"123"}]}}</pre>',
      502,
    ],
  ] as const)(
    'handles %s quote responses without returning invalid prices',
    async (_, html, status) => {
      browser.document
        .mockResolvedValueOnce('<pre>crumb</pre>')
        .mockResolvedValueOnce(html);
      await request(server).get('/asset/quote/BAD').expect(status);
    },
  );

  it.each(['<html>Consent</html>', '<pre>Too Many Requests</pre>'])(
    'rejects invalid crumbs: %s',
    async (html) => {
      browser.document.mockResolvedValue(html);
      await request(server).get('/asset/quote/BAD').expect(502);
      expect(browser.navigation).toHaveBeenCalledTimes(1);
    },
  );

  it('rejects empty company profiles', async () => {
    browser.document
      .mockResolvedValueOnce('<pre>crumb</pre>')
      .mockResolvedValueOnce(quoteHtml)
      .mockResolvedValueOnce('<html>Bot challenge</html>');
    await request(server).get('/asset/profile/BAD').expect(502);
  });

  it('serves metal quotes without any browser navigation and caches them by URL', async () => {
    await request(server).get('/asset/quote/metal/gold').expect(200);
    await request(server).get('/asset/quote/metal/gold').expect(200);
    expect(goldApi.fetch).toHaveBeenCalledTimes(3);
    expect(browser.navigation).not.toHaveBeenCalled();
  });

  it('maps Gold-API failures to 502 without caching errors or exposing upstream details', async () => {
    goldApi.fetch.mockRejectedValueOnce(
      new Error('secret internal upstream failure'),
    );
    const response = await request(server)
      .get('/asset/quote/metal/gold')
      .expect(502);
    expect(response.body).toEqual({
      statusCode: 502,
      message: 'Gold-API spot price request failed.',
      error: 'Bad Gateway',
    });
    await request(server).get('/asset/quote/metal/gold').expect(200);
    expect(goldApi.fetch).toHaveBeenCalledTimes(4);
  });

  it('does not cache upstream failures and does not disclose URLs or crumbs', async () => {
    browser.navigation.mockRejectedValueOnce(
      new Error('secret crumb and internal URL'),
    );
    const response = await request(server)
      .get('/asset/search/retry')
      .expect(502);
    expect(JSON.stringify(response.body)).not.toContain('secret');
    await request(server).get('/asset/search/retry').expect(200);
    expect(browser.navigation).toHaveBeenCalledTimes(2);
  });

  it('rejects upstream HTTP errors even if they contain parseable data', async () => {
    browser.navigation.mockResolvedValueOnce({
      ok: () => false,
      status: () => 429,
    });
    await request(server).get('/asset/search/rate-limited').expect(502);
  });
});
