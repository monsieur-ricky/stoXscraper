import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as cheerio from 'cheerio';
import EXCHANGE_INFO from '../assets/data/exchange-info.json';
import { PlaywrightService } from '../utilities/playwright.service';
import type { Symbol } from './entities/symbol.entity';
import type { Quote } from './entities/quote.entity';
import type { Profile } from './entities/profile.entity';
import type { MetalQuote } from './entities/metal-quote.entity';
import type { RequestOptions } from './entities/request-options.entity';
import { GoldApiService } from './gold-api.service';

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BadGatewayException('Invalid financial provider response.');
  }
  return value as Record<string, unknown>;
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function requiredNumber(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new BadGatewayException('Invalid financial provider price data.');
  }
  return value;
}

function optionalNumber(value: unknown): number | undefined {
  return value === undefined || value === null
    ? undefined
    : requiredNumber(value);
}

@Injectable()
export class AssetService {
  constructor(
    private readonly playwrightService: PlaywrightService,
    private readonly goldApiService: GoldApiService,
  ) {}

  async search(term: string): Promise<Symbol[]> {
    const query = this.input(term, 200);
    const response = record(
      await this.fetchJson(
        `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}`,
      ),
    );
    if (!Array.isArray(response.quotes)) {
      throw new BadGatewayException(
        'Invalid financial provider search results.',
      );
    }

    return response.quotes.map((item: unknown) => {
      const quote = record(item);
      const symbol = text(quote.symbol);
      if (!symbol)
        throw new BadGatewayException('Missing financial provider symbol.');
      const exchange = text(quote.exchDisp);
      const exchangeInfo = EXCHANGE_INFO.find(
        (info) =>
          info.exchangeCode === exchange || info.exchangeName === exchange,
      );
      return {
        symbol,
        name: text(quote.longname) ?? text(quote.shortname) ?? symbol,
        exchangeShortName: exchangeInfo?.exchangeCode ?? exchange,
        stockExchange: exchangeInfo?.exchangeName ?? exchange,
        currency: exchangeInfo?.currencyCode,
        type: text(quote.quoteType),
      };
    });
  }

  async getQuote(symbol: string): Promise<Quote & Symbol> {
    const ticker = this.input(symbol, 128).toUpperCase();
    const crumbHtml = await this.fetchHtml(
      'https://query1.finance.yahoo.com/v1/test/getcrumb',
    );
    const crumb = cheerio.load(crumbHtml)('pre').text().trim();
    if (!crumb || /\s/.test(crumb)) {
      throw new BadGatewayException('Invalid financial provider session.');
    }
    const data = record(
      await this.fetchJson(
        `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(ticker)}&crumb=${encodeURIComponent(crumb)}`,
      ),
    );
    const response = record(data.quoteResponse);
    if (response.error || !Array.isArray(response.result)) {
      throw new BadGatewayException(
        'Invalid financial provider quote response.',
      );
    }
    if (response.result.length === 0)
      throw new NotFoundException('Asset not found.');
    const quote = record(response.result[0]);
    return {
      symbol: ticker,
      currency: text(quote.currency),
      price: requiredNumber(quote.regularMarketPrice),
      changeValue: requiredNumber(quote.regularMarketChange),
      changePercent: requiredNumber(quote.regularMarketChangePercent),
      fiftyDayAverage: optionalNumber(quote.fiftyDayAverage),
      fiftyTwoWeekHigh: optionalNumber(quote.fiftyTwoWeekHigh),
      fiftyTwoWeekLow: optionalNumber(quote.fiftyTwoWeekLow),
      trailingAnnualDividendRate: optionalNumber(
        quote.trailingAnnualDividendRate,
      ),
      dividendYield: optionalNumber(quote.dividendYield),
      regularMarketDayHigh: optionalNumber(quote.regularMarketDayHigh),
      regularMarketDayLow: optionalNumber(quote.regularMarketDayLow),
      name: text(quote.shortName) ?? ticker,
      exchangeShortName: text(quote.fullExchangeName),
    };
  }

  async getProfile(symbol: string): Promise<Profile> {
    const ticker = this.input(symbol, 128).toUpperCase();
    const quote = await this.getQuote(ticker);
    const html = await this.fetchHtml(
      `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}/profile/`,
    );
    const $ = cheerio.load(html);
    const description = $('[data-testid="description"] > p').text().trim();
    if (!description)
      throw new BadGatewayException('Invalid financial provider profile.');
    return {
      description,
      address: $('.address').text().trim(),
      phone: $('a[aria-label="phone number"]').text().trim(),
      website: $('a[aria-label="website link"]').attr('href'),
      sector: $('dt:contains("Sector:")').next().text().trim(),
      industry: $('dt:contains("Industry:")').next().text().trim(),
      fullTimeEmployees: $('dt:contains("Full Time Employees:")')
        .next()
        .text()
        .trim(),
      ceo: $('td:contains("CEO")').prev().text().trim(),
      ...quote,
    };
  }

  async getMetalQuote(input: string): Promise<MetalQuote> {
    const metal = this.input(input, 10).toLowerCase();
    if (metal !== 'gold' && metal !== 'silver') {
      throw new BadRequestException('Supported metals are gold and silver.');
    }
    return this.goldApiService.getQuote(metal);
  }

  private input(value: string, maxLength: number): string {
    const input = value.trim();
    if (
      !input ||
      input.length > maxLength ||
      [...input].some(
        (character) =>
          character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
      )
    ) {
      throw new BadRequestException('Invalid asset query.');
    }
    return input;
  }

  private async fetchJson(url: string): Promise<unknown> {
    const html = await this.fetchHtml(url);
    try {
      return JSON.parse(cheerio.load(html)('pre').text().trim()) as unknown;
    } catch {
      throw new BadGatewayException(
        'Invalid financial provider JSON response.',
      );
    }
  }

  private async fetchHtml(
    url: string,
    options?: RequestOptions,
  ): Promise<string> {
    try {
      return await this.playwrightService.makeBrowserRequest(url, options);
    } catch {
      // Do not expose URLs containing Yahoo crumbs or upstream internals to clients.
      throw new BadGatewayException('Financial provider request failed.');
    }
  }
}
