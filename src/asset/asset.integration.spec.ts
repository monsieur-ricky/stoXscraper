import { Test, TestingModule } from '@nestjs/testing';
import { AssetController } from './asset.controller';
import { AssetService } from './asset.service';
import { PlaywrightService } from '../utilities/playwright.service';
import { profileHtml, quoteHtml, searchHtml } from '../../test/fixtures';
import {
  GOLD_API_CLOCK,
  GOLD_API_FETCH,
  GoldApiService,
} from './gold-api.service';
import { goldApiHarness } from '../../test/gold-api-harness';

describe('Asset controller / service / parser integration', () => {
  let module: TestingModule;
  let controller: AssetController;
  const request = jest.fn<Promise<string>, [string, unknown?]>();
  let goldApi: ReturnType<typeof goldApiHarness>;

  beforeEach(async () => {
    request.mockReset();
    goldApi = goldApiHarness();
    module = await Test.createTestingModule({
      controllers: [AssetController],
      providers: [
        AssetService,
        GoldApiService,
        { provide: GOLD_API_FETCH, useValue: goldApi.fetch },
        { provide: GOLD_API_CLOCK, useValue: goldApi.clock },
        {
          provide: PlaywrightService,
          useValue: { makeBrowserRequest: request },
        },
      ],
    }).compile();
    controller = module.get(AssetController);
  });

  afterEach(async () => {
    await module.close();
  });

  it('maps Yahoo search results and falls back for unknown exchanges', async () => {
    request.mockResolvedValue(searchHtml);
    const symbols = await controller.search('Apple');
    expect(request).toHaveBeenCalledWith(
      'https://query2.finance.yahoo.com/v1/finance/search?q=Apple',
      undefined,
    );
    expect(symbols).toEqual([
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        exchangeShortName: 'NASDAQ',
        stockExchange: 'NASDAQ Stock Market',
        currency: 'USD',
        type: 'EQUITY',
      },
      {
        symbol: 'UNKNOWN',
        name: 'Unknown exchange',
        exchangeShortName: 'OTHER',
        stockExchange: 'OTHER',
        currency: undefined,
        type: 'ETF',
      },
    ]);
  });

  it('returns an empty list for an empty search', async () => {
    request.mockResolvedValue('<pre>{"quotes":[]}</pre>');
    await expect(controller.search('missing')).resolves.toEqual([]);
  });

  it('normalizes ticker case, obtains a crumb, and maps quote fields', async () => {
    request
      .mockResolvedValueOnce('<pre>crumb-token</pre>')
      .mockResolvedValueOnce(quoteHtml);
    await expect(controller.quote('aapl')).resolves.toEqual({
      symbol: 'AAPL',
      currency: 'USD',
      price: 200.25,
      changeValue: 1.5,
      changePercent: 0.75,
      fiftyDayAverage: 190,
      fiftyTwoWeekHigh: 220,
      fiftyTwoWeekLow: 150,
      trailingAnnualDividendRate: 1,
      dividendYield: 0.5,
      regularMarketDayHigh: 201,
      regularMarketDayLow: 198,
      name: 'Apple Inc.',
      exchangeShortName: 'NasdaqGS',
    });
    expect(request).toHaveBeenNthCalledWith(
      2,
      'https://query1.finance.yahoo.com/v7/finance/quote?symbols=AAPL&crumb=crumb-token',
      undefined,
    );
  });

  it('combines parsed company information with its quote', async () => {
    request
      .mockResolvedValueOnce('<pre>crumb</pre>')
      .mockResolvedValueOnce(quoteHtml)
      .mockResolvedValueOnce(profileHtml);
    await expect(controller.details('aapl')).resolves.toMatchObject({
      symbol: 'AAPL',
      price: 200.25,
      description: 'A synthetic company description.',
      sector: 'Technology',
      industry: 'Consumer Electronics',
      fullTimeEmployees: '100,000',
      ceo: 'Jane Example',
      address: 'Example Street',
      phone: '123456',
      website: 'https://example.com',
    });
    expect(request).toHaveBeenLastCalledWith(
      'https://finance.yahoo.com/quote/AAPL/profile/',
      undefined,
    );
  });

  it.each([
    ['gold', 2000.5, 2200.75, 1700.25],
    ['silver', 30.5, 33.75, 25.25],
  ] as const)(
    'maps Gold-API %s spot prices and converts troy ounces to grams',
    async (metal, euro, dollar, pound) => {
      await expect(controller.metalQuote(metal)).resolves.toEqual({
        metal,
        pricePerOunceEuro: euro,
        pricePerOunceDollar: dollar,
        pricePerOuncePound: pound,
        pricePerGramEuro: Math.round((euro / 31.1035) * 100) / 100,
        pricePerGramDollar: Math.round((dollar / 31.1035) * 100) / 100,
        pricePerGramPound: Math.round((pound / 31.1035) * 100) / 100,
      });
      expect(request).not.toHaveBeenCalled();
      const symbol = metal === 'gold' ? 'XAU' : 'XAG';
      expect(goldApi.fetch.mock.calls.map(([url]) => url)).toEqual(
        ['USD', 'EUR', 'GBP'].map(
          (currency) => `https://api.gold-api.com/price/${symbol}/${currency}`,
        ),
      );
    },
  );
});
