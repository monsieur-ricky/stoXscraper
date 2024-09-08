import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Symbol } from './entities/symbol.entity';
import { Quote } from './entities/quote.entity';
import { Profile } from './entities/profile.entity';

import * as EXCHANGE_INFO from '../assets/data/exchange-info.json';
import * as cheerio from 'cheerio';

type ExchangeInfo = {
  exchangeCode: string;
  exchangeName: string;
  country: string;
  currencyCode: string;
  currencyName: string;
  exchangeCity: string;
};

@Injectable()
export class SymbolService {
  private readonly yahooFinanceDomain = 'finance.yahoo.com';
  private readonly searchUrl = `https://query2.${this.yahooFinanceDomain}/v1/finance/search`;
  private readonly quoteUrl = `https://query1.${this.yahooFinanceDomain}/v7/finance/quote?symbols`;
  private readonly profileUrl = `https://${this.yahooFinanceDomain}/quote/`;
  private readonly crumbUrl = `https://query1.${this.yahooFinanceDomain}/v1/test/getcrumb`;
  private readonly headers = {
    headers: {
      'User-Agent': process.env.YAHOO_USER_AGENT,
      Cookie: process.env.YAHOO_COOKIE,
    },
  };

  constructor(private readonly httpService: HttpService) {}

  async search(term: string): Promise<Symbol[]> {
    const url = `${this.searchUrl}?q=${term}`;
    const response = await firstValueFrom(this.httpService.get(url));
    const quotes: any[] = response?.data?.quotes ?? [];
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
    const response = await firstValueFrom(
      this.httpService.get(`${this.profileUrl}${symbol}/profile/`, {
        headers: {
          ...this.headers.headers,
          Referer: 'https://finance.yahoo.com/quote/AAPL/',
        },
      }),
    );

    const $ = cheerio.load(response?.data, { xmlMode: false });
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
    const crumbResponse = await firstValueFrom(
      this.httpService.get(this.crumbUrl, this.headers),
    );

    return crumbResponse?.data;
  }

  private async getQuoteInfo(symbol: string): Promise<Quote & Symbol> {
    const crumb = await this.getCrumb();
    const quoteUrl = `${this.quoteUrl}=${symbol}&crumb=${crumb}`;
    const response = await firstValueFrom(
      this.httpService.get(quoteUrl, this.headers),
    );

    const quote = response?.data?.quoteResponse?.result[0];

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
}
