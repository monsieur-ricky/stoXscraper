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

export const metalHtml = `<div class="wpb_wrapper"><table>
<tr><td>Gold Price per Ounce</td><td>€2,000.50</td><td>US$2,200.75</td><td>£1,700.25</td></tr>
<tr><td>Silver Ounce(1oz)</td><td>€30.50</td><td>US$33.75</td><td>£25.25</td></tr>
</table></div>`;
