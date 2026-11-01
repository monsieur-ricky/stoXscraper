# Gold and silver spot-price provider

## Provider and public contract

Metal quotes use **[Gold-API.com](https://gold-api.com/)** (`api.gold-api.com`), not the similarly named GoldAPI.io, VeraCash website scraping, or Yahoo's COMEX futures. The provider describes these as indicative **spot** prices per **troy ounce**. They are not guaranteed executable dealer bid/ask prices, and do not include physical-product premiums, fees or taxes.

No account, API key, cookies, Playwright or Cheerio processing is used for metal requests. Node 24's built-in `fetch` performs direct HTTPS requests; no new package is required. The full application still initializes its Yahoo browser at startup.

| Public endpoint             | Provider symbol | Provider requests                                    |
| --------------------------- | --------------- | ---------------------------------------------------- |
| `/asset/quote/metal/gold`   | `XAU`           | `/price/XAU/USD`, `/price/XAU/EUR`, `/price/XAU/GBP` |
| `/asset/quote/metal/silver` | `XAG`           | `/price/XAG/USD`, `/price/XAG/EUR`, `/price/XAG/GBP` |

Every provider URL is under `https://api.gold-api.com`. Currency prices are obtained directly from the provider, not converted using Yahoo or a second FX feed. Existing endpoint paths, case normalization, unsupported-metal 400 errors, and response field names are preserved:

| Response field        | Meaning                                            |
| --------------------- | -------------------------------------------------- |
| `metal`               | `gold` or `silver`                                 |
| `pricePerOunceDollar` | USD spot price per troy ounce                      |
| `pricePerOunceEuro`   | EUR spot price per troy ounce                      |
| `pricePerOuncePound`  | GBP spot price per troy ounce                      |
| `pricePerGramDollar`  | USD ounce price / 31.1035, rounded to two decimals |
| `pricePerGramEuro`    | EUR ounce price / 31.1035, rounded to two decimals |
| `pricePerGramPound`   | GBP ounce price / 31.1035, rounded to two decimals |

## Quotas, cache and concurrency

Gold-API advertises free, keyless current-price endpoints and 30-second updates. Its usage guidance prohibits bursts despite advertising no fixed request quota. The adapter therefore:

- Serializes HTTP calls with **at least 1.1 seconds between start times**, shared across gold, silver and currencies in a process.
- Caches validated `(symbol, currency)` quotes for **30 seconds** and coalesces identical in-flight requests. This applies even if the public HTTP cache is missed, reset or configured with a short TTL.
- Uses a **10-second timeout per upstream call**, including response-body reading, and rejects redirects. No user headers, Yahoo cookies or secrets are forwarded.
- Does not automatically retry failed requests. On HTTP 429 it stops upstream traffic during a **minimum 30-second cooldown**, honoring longer numeric/date `Retry-After` values. Queued/client requests receive 502 during cooldown; a later request can retry once the period ends.

A cold single-metal request needs three upstream calls and takes at least roughly 2.2 seconds plus network time. Both cold metals share six paced requests. No partial/mixed-currency response is returned if any component fails; successfully validated components may be reused on a subsequent request.

The global Nest HTTP cache is an additional layer controlled by `CACHE_TTL` (60 seconds by default). Setting it to zero means no expiration; it does **not** disable caching and is inappropriate when continuously refreshed prices are required. Do not increase TTL without considering how old a public response may become.

Queues, quote caches and cooldowns are **per process**, not shared across replicas. For multi-replica deployments or shared public egress IPs, coordinate throttling/caching centrally or obtain a provider arrangement; scaling instances must not multiply requests into bursts.

## Validation and failure behavior

The adapter checks each response is a JSON object with the exact requested `symbol` and `currency`, a positive finite numeric `price` within JavaScript's safe range, and a parseable `updatedAt`. It rejects timestamps older than five minutes or more than one minute ahead of the system clock **when received**. Keep server time synchronized. A later HTTP-cache hit is governed by `CACHE_TTL`, not revalidated upstream.

The provider defines `updatedAt` as the time its data source was fetched, not the last market trade. A recent timestamp does not mean markets are open or that price discovery occurred recently. Three currency requests may have slightly different timestamps; this is not an atomic executable quote.

HTTP errors, timeouts, invalid JSON/identity/prices, stale timestamps, and unavailable currencies return **502** with `Gold-API spot price request failed.`. Errors are not cached as prices. There is no fallback to VeraCash, Yahoo futures, fabricated zeros, or an unlabelled stale price.

## Terms and verification

- [API reference and usage guidance](https://gold-api.com/llms.txt)
- [Documentation](https://gold-api.com/docs)
- [Terms of service](https://gold-api.com/terms)

At review time (2026-11-01), the terms permit commercial applications but offer no accuracy or uptime warranty and allow access restriction for abuse. Recheck terms before deployment or redistribution, and arrange explicit licensing/SLA requirements for a business-critical financial product. The project does not independently certify the provider's data accuracy or underlying sources.

For a manual check, start the application and run:

```bash
curl --fail-with-body http://localhost:3000/asset/quote/metal/gold
curl --fail-with-body http://localhost:3000/asset/quote/metal/silver
```

The deterministic suite mocks only external HTTP/time boundaries; it does not contact Gold-API in CI. See `MIGRATION_PLAN.md` for point-in-time live verification results.
