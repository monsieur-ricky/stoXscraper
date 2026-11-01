// Deliberately synthetic provider-shaped documents: no live financial data or cookies.
export const searchHtml = `<html><body><pre>${JSON.stringify({
  quotes: [
    {
      symbol: 'AAPL',
      longname: 'Apple Inc.',
      exchDisp: 'NASDAQ',
      quoteType: 'EQUITY',
    },
    {
      symbol: 'UNKNOWN',
      longname: 'Unknown exchange',
      exchDisp: 'OTHER',
      quoteType: 'ETF',
    },
  ],
})}</pre></body></html>`;

export const quoteHtml = `<pre>${JSON.stringify({
  quoteResponse: {
    result: [
      {
        currency: 'USD',
        regularMarketPrice: 200.25,
        regularMarketChange: 1.5,
        regularMarketChangePercent: 0.75,
        fiftyDayAverage: 190,
        fiftyTwoWeekHigh: 220,
        fiftyTwoWeekLow: 150,
        trailingAnnualDividendRate: 1,
        dividendYield: 0.5,
        regularMarketDayHigh: 201,
        regularMarketDayLow: 198,
        shortName: 'Apple Inc.',
        fullExchangeName: 'NasdaqGS',
      },
    ],
  },
})}</pre>`;

export const profileHtml = `
<section data-testid="description"><p>A synthetic company description.</p></section>
<dl><dt>Sector:</dt><dd>Technology</dd><dt>Industry:</dt><dd>Consumer Electronics</dd>
<dt>Full Time Employees:</dt><dd>100,000</dd></dl>
<table><tr><td>Jane Example</td><td>CEO</td></tr></table>
<div class="address">Example Street</div>
<a aria-label="phone number">123456</a>
<a aria-label="website link" href="https://example.com">Website</a>`;

export function metalQuoteData(
  symbol: string,
  currency: string,
  now = Date.now(),
) {
  const prices: Record<string, Record<string, number>> = {
    XAU: { USD: 2200.75, EUR: 2000.5, GBP: 1700.25 },
    XAG: { USD: 33.75, EUR: 30.5, GBP: 25.25 },
  };
  return {
    symbol,
    currency,
    price: prices[symbol]?.[currency],
    updatedAt: new Date(now).toISOString(),
  };
}
