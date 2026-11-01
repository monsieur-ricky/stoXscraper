import { goldApiClock } from './gold-api.service';

describe('Gold-API production clock', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('uses the system clock and a real timer boundary', async () => {
    jest.useFakeTimers();
    const before = goldApiClock.now();
    const delay = goldApiClock.sleep(1100);
    await jest.advanceTimersByTimeAsync(1100);
    await delay;
    expect(goldApiClock.now() - before).toBe(1100);
  });
});
