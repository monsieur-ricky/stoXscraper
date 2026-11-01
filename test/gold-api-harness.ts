import type { GoldApiClock } from '../src/asset/gold-api.service';
import { metalQuoteData } from './fixtures';

export function goldApiHarness() {
  let now = Date.now();
  const startedAt: number[] = [];
  const clock: GoldApiClock = {
    now: () => now,
    sleep: jest.fn(async (milliseconds: number) => {
      now += milliseconds;
    }),
  };
  const fetch = jest
    .fn<
      ReturnType<typeof globalThis.fetch>,
      Parameters<typeof globalThis.fetch>
    >()
    .mockImplementation(async (url) => {
      startedAt.push(now);
      const [, symbol, currency] = new URL(String(url)).pathname
        .split('/')
        .slice(1);
      return Response.json(metalQuoteData(symbol, currency, now));
    });
  return {
    fetch,
    clock,
    startedAt,
    advance: (milliseconds: number) => {
      now += milliseconds;
    },
  };
}
