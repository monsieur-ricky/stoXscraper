import { BadGatewayException, Inject, Injectable } from '@nestjs/common';
import type { MetalQuote } from './entities/metal-quote.entity';

export const GOLD_API_FETCH = Symbol('GOLD_API_FETCH');
export const GOLD_API_CLOCK = Symbol('GOLD_API_CLOCK');

export interface GoldApiClock {
  now(): number;
  sleep(milliseconds: number): Promise<void>;
}

export const goldApiClock: GoldApiClock = {
  now: () => Date.now(),
  sleep: (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
};

type Currency = 'USD' | 'EUR' | 'GBP';
type Metal = 'gold' | 'silver';

@Injectable()
export class GoldApiService {
  private readonly cache = new Map<
    string,
    { price: number; expiresAt: number }
  >();
  private readonly pending = new Map<string, Promise<number>>();
  private queue: Promise<void> = Promise.resolve();
  private nextRequestAt = 0;
  private cooldownUntil = 0;

  constructor(
    @Inject(GOLD_API_FETCH) private readonly fetch: typeof globalThis.fetch,
    @Inject(GOLD_API_CLOCK) private readonly clock: GoldApiClock,
  ) {}

  async getQuote(metal: Metal): Promise<MetalQuote> {
    const symbol = metal === 'gold' ? 'XAU' : 'XAG';
    // Queue globally, even across simultaneous gold/silver requests. Gold-API forbids bursts.
    const [pricePerOunceDollar, pricePerOunceEuro, pricePerOuncePound] =
      await Promise.all(
        (['USD', 'EUR', 'GBP'] as const).map((currency) =>
          this.getPrice(symbol, currency),
        ),
      );
    const perGram = (price: number) =>
      Math.round((price / 31.1035 + Number.EPSILON) * 100) / 100;
    return {
      metal,
      pricePerOunceDollar,
      pricePerOunceEuro,
      pricePerOuncePound,
      pricePerGramDollar: perGram(pricePerOunceDollar),
      pricePerGramEuro: perGram(pricePerOunceEuro),
      pricePerGramPound: perGram(pricePerOuncePound),
    };
  }

  private getPrice(symbol: string, currency: Currency): Promise<number> {
    const key = `${symbol}/${currency}`;
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > this.clock.now())
      return Promise.resolve(cached.price);
    const pending = this.pending.get(key);
    if (pending) return pending;

    const request = this.queue.then(async () => {
      const delay = this.nextRequestAt - this.clock.now();
      if (delay > 0) await this.clock.sleep(delay);
      this.nextRequestAt = this.clock.now() + 1100;
      const price = await this.fetchPrice(symbol, currency);
      this.cache.set(key, { price, expiresAt: this.clock.now() + 30000 });
      return price;
    });
    // A rejected request must not poison the queue or become an unhandled rejection.
    this.queue = request.then(
      () => undefined,
      () => undefined,
    );
    this.pending.set(key, request);
    void request.then(
      () => this.pending.delete(key),
      () => this.pending.delete(key),
    );
    return request;
  }

  private async fetchPrice(
    symbol: string,
    currency: Currency,
  ): Promise<number> {
    try {
      if (this.clock.now() < this.cooldownUntil)
        throw new Error('Provider rate-limit cooldown.');
      const response = await this.fetch(
        `https://api.gold-api.com/price/${symbol}/${currency}`,
        {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(10000),
          redirect: 'error',
        },
      );
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const seconds = Number(retryAfter);
        const retryAt =
          Number.isFinite(seconds) && seconds > 0
            ? this.clock.now() + seconds * 1000
            : Date.parse(retryAfter ?? '');
        this.cooldownUntil = Math.max(
          this.clock.now() + 30000,
          Number.isFinite(retryAt) ? retryAt : 0,
        );
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error('Upstream HTTP failure.');
      }
      const data: unknown = await response.json();
      if (typeof data !== 'object' || data === null || Array.isArray(data))
        throw new Error('Invalid payload.');
      const quote = data as Record<string, unknown>;
      const timestamp =
        typeof quote.updatedAt === 'string' ? Date.parse(quote.updatedAt) : NaN;
      if (
        quote.symbol !== symbol ||
        quote.currency !== currency ||
        typeof quote.price !== 'number' ||
        !Number.isFinite(quote.price) ||
        quote.price <= 0 ||
        quote.price > Number.MAX_SAFE_INTEGER ||
        !Number.isFinite(timestamp) ||
        this.clock.now() - timestamp > 300000 ||
        timestamp - this.clock.now() > 60000
      )
        throw new Error('Invalid or stale quote.');
      return quote.price;
    } catch {
      throw new BadGatewayException('Gold-API spot price request failed.');
    }
  }
}
