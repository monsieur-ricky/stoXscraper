import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Symbol } from './entities/symbol.entity';
import { Quote } from './entities/quote.entity';
import { Profile } from './entities/profile.entity';

import * as EXCHANGE_INFO from '../assets/data/exchange-info.json';
import * as cheerio from 'cheerio';
import { MetalQuote } from './entities/metal-quote.entity';
import { PlaywrightService } from '../utilities/playwright.service';

type ExchangeInfo = {
  exchangeCode: string;
  exchangeName: string;
  country: string;
  currencyCode: string;
  currencyName: string;
  exchangeCity: string;
};

@Injectable()
export class AssetService {
  private readonly yahooFinanceDomain = 'finance.yahoo.com';
  private readonly searchUrl = `https://query2.${this.yahooFinanceDomain}/v1/finance/search`;
  private readonly quoteUrl = `https://query1.${this.yahooFinanceDomain}/v7/finance/quote?symbols`;
  private readonly profileUrl = `https://${this.yahooFinanceDomain}/quote/`;
  private readonly crumbUrl = `https://query1.${this.yahooFinanceDomain}/v1/test/getcrumb`;
  private readonly metalQuoteUrl = 'https://www.veracash.com';

  constructor(
    private readonly httpService: HttpService,
    private readonly playwrightService: PlaywrightService,
  ) {}

  async search(term: string): Promise<Symbol[]> {
    const url = `${this.searchUrl}?q=${term}`;

    const response = await this.fetchDataWithBrowser(url);

    const $ = cheerio.load(response, { xmlMode: false });
    const data = $('pre').text().trim();
    const quotes: any[] = JSON.parse(data)?.quotes ?? [];

    const symbols: Symbol[] = quotes.map((quote) => {
      const exchangeInfo = this.getExchangeInfo(quote?.exchDisp);

      return {
        symbol: quote?.symbol,
        name: quote?.longname,
        exchangeShortName: exchangeInfo?.exchangeCode ?? quote?.exchDisp,
        stockExchange: exchangeInfo?.exchangeName ?? quote?.exchDisp,
        currency: exchangeInfo?.currencyCode,
        type: quote.quoteType,
      };
    });

    return symbols;
  }

  async getQuote(symbol: string): Promise<Quote> {
    const quote = await this.getQuoteInfo(symbol.toUpperCase());

    return {
      ...quote,
    };
  }

  async getMetalQuote(metal: string): Promise<MetalQuote> {
    const metalQuote = await this.getMetalQuoteInfo(metal);

    return {
      ...metalQuote,
    };
  }

  async getProfile(symbol: string): Promise<any> {
    const quote = await this.getQuoteInfo(symbol.toUpperCase());
    const profile = await this.getProfileInfo(symbol.toUpperCase());

    return {
      ...profile,
      ...quote,
    };
  }

  private getExchangeInfo(exchange: string): ExchangeInfo {
    const exchangeInfo = EXCHANGE_INFO.find(
      (info) =>
        info.exchangeCode === exchange || info.exchangeName === exchange,
    );

    return exchangeInfo;
  }

  private async getProfileInfo(symbol: string): Promise<Profile> {
    const url = `${this.profileUrl}${symbol}/profile/`;
    const response = await this.fetchDataWithBrowser(url);

    const $ = cheerio.load(response, { xmlMode: false });
    const description = $('[data-testid="description"] > p').text();
    const sector = $('dt:contains("Sector:")').next().text().trim();
    const industry = $('dt:contains("Industry:")').next().text().trim();
    const ceo = $('td:contains("CEO")').prev().text().trim();
    const address = $('.address').text();
    const phone = $('a[aria-label="phone number"]').text();
    const website = $('a[aria-label="website link"]').attr('href');
    const fullTimeEmployees = $('dt:contains("Full Time Employees:")')
      .next()
      .text()
      .trim();

    return {
      description,
      address,
      phone,
      website,
      sector,
      industry,
      fullTimeEmployees,
      ceo,
    };
  }

  private async getCrumb(): Promise<string> {
    const response = await this.fetchDataWithBrowser(this.crumbUrl);

    const $ = cheerio.load(response, { xmlMode: false });
    const crumb = $('pre').text().trim();

    return crumb;
  }

  private async getQuoteInfo(symbol: string): Promise<Quote & Symbol> {
    const crumb = await this.getCrumb();
    const url = `${this.quoteUrl}=${symbol}&crumb=${crumb}`;

    const response = await this.fetchDataWithBrowser(url);

    const $ = cheerio.load(response, { xmlMode: false });
    const data = $('pre').text().trim();
    const quote = JSON.parse(data)?.quoteResponse?.result[0];

    return {
      symbol,
      currency: quote?.currency,
      price: quote?.regularMarketPrice,
      changeValue: quote?.regularMarketChange,
      changePercent: quote?.regularMarketChangePercent,
      fiftyDayAverage: quote?.fiftyDayAverage,
      fiftyTwoWeekHigh: quote?.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: quote?.fiftyTwoWeekLow,
      trailingAnnualDividendRate: quote?.trailingAnnualDividendRate,
      dividendYield: quote?.dividendYield,
      regularMarketDayHigh: quote?.regularMarketDayHigh,
      regularMarketDayLow: quote?.regularMarketDayLow,
      name: quote?.shortName,
      exchangeShortName: quote?.fullExchangeName,
    };
  }

  private async getMetalQuoteInfo(metal: string): Promise<MetalQuote> {
    const metalQuoteUrl = `${this.metalQuoteUrl}/${metal}-price-and-chart/`;
    const response = await firstValueFrom(this.httpService.get(metalQuoteUrl));

    const $ = cheerio.load(response?.data, { xmlMode: false });

    const ounceQuote =
      metal === 'gold'
        ? this.getGoldOunceQuote($)
        : this.getSilverOunceQuote($);

    const { pricePerOunceEuro, pricePerOunceDollar, pricePerOuncePound } =
      ounceQuote;

    const troyOzToGram = 31.1035; // 1 troy ounce = 31.1035 grams
    const pricePerGramDollar =
      Math.round((pricePerOunceDollar / troyOzToGram + Number.EPSILON) * 100) /
      100;
    const pricePerGramEuro =
      Math.round((pricePerOunceEuro / troyOzToGram + Number.EPSILON) * 100) /
      100;
    const pricePerGramPound =
      Math.round((pricePerOuncePound / troyOzToGram + Number.EPSILON) * 100) /
      100;

    return {
      metal,
      pricePerOunceDollar,
      pricePerOunceEuro,
      pricePerOuncePound,
      pricePerGramDollar,
      pricePerGramEuro,
      pricePerGramPound,
    };
  }

  private getGoldOunceQuote($: cheerio.Root): MetalQuote {
    const tableRow = $(`table tr td:contains("Gold Price per Ounce")`).parent();
    const pricePerOunceEuro = Number(
      tableRow.find('td:nth-child(2)').first().text().replace(/[€,]/g, ''),
    );
    const pricePerOunceDollar = Number(
      tableRow
        .find('td:nth-child(3)')
        .first()
        .text()
        .replace(/[US$,]/g, ''),
    );
    const pricePerOuncePound = Number(
      tableRow.find('td:nth-child(4)').first().text().replace(/[£,]/g, ''),
    );

    return {
      metal: 'gold',
      pricePerOunceDollar,
      pricePerOunceEuro,
      pricePerOuncePound,
    };
  }

  private getSilverOunceQuote($: cheerio.Root): MetalQuote {
    const tableRow = $(`table tr td:contains("Silver Ounce(1oz)")`).parent();
    const pricePerOunceEuro = Number(
      tableRow.find('td:nth-child(2)').first().text().replace(/[€,]/g, ''),
    );
    const pricePerOunceDollar = Number(
      tableRow
        .find('td:nth-child(3)')
        .first()
        .text()
        .replace(/[US$,]/g, ''),
    );
    const pricePerOuncePound = Number(
      tableRow.find('td:nth-child(4)').first().text().replace(/[£,]/g, ''),
    );

    return {
      metal: 'silver',
      pricePerOunceDollar,
      pricePerOunceEuro,
      pricePerOuncePound,
    };
  }

  private async fetchDataWithBrowser(url: string): Promise<string> {
    try {
      const data = await this.playwrightService.makeBrowserRequest(url);
      return data;
    } catch (error) {
      Logger.error(`Browser request failed for URL: ${url}`, error);
      throw error;
    }
  }
}
