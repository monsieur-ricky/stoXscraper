# stoXscraper

NestJS API for financial asset search, quotes, profiles, and gold/silver prices. Created for [stoXevo](https://github.com/monsieur-ricky/stoXevo).

**Web scraping is fragile.** Yahoo Finance and VeraCash may change markup, require consent, rate-limit requests, or block automation. Respect provider terms and use official financial data APIs for production-critical decisions. This project does not guarantee live provider availability or financial accuracy.

## Requirements

- **Node.js 24 LTS, version 24.15 or newer within the 24.x line**, and npm 11. Use the latest Node 24 security release. `.nvmrc` and `.node-version` select that line.
- Chromium installed by the project's Playwright version, plus its OS libraries.
- NestJS 12.3.2; TypeScript 6.0.3 is deliberately retained because current Nest schematics, typescript-eslint and ts-jest do not jointly support TypeScript 7.

## Install and run

```bash
git clone git@github.com:monsieur-ricky/stoXscraper.git
cd stoXscraper
nvm install # optional, if using nvm
nvm use
npm ci
cp .env.example .env
npm run browser:install
```

On Linux, install Chromium's system libraries during machine/container provisioning with `npm run browser:install-deps` (may require administrator privileges). This is an explicit setup operation, not an application startup side effect.

Prepare Yahoo session cookies with `npm run cookies:setup` before using Yahoo quote/profile endpoints. Yahoo can reject requests without a valid session with HTTP 401, which this API maps to 502. This command contacts Yahoo and may accept its consent prompt; run it only after reviewing the provider's terms and consent behavior. It loads `.env`, respects `YAHOO_COOKIES_PATH`, and saves sensitive cookies locally. Never commit cookies. Re-run explicitly if a Yahoo session expires, then **restart the app** so it loads the refreshed file; no cookie refresh is performed at startup.

```bash
npm start              # build and run
npm run start:dev      # watch mode
npm run start:debug    # debugger + watch mode
```

For production, build with dev dependencies first, then retain only runtime dependencies:

```bash
npm ci
npm run build
npm ci --omit=dev
npm run browser:install
npm run start:prod
```

Keep `dist/`, the production dependencies, and Playwright's browser installation accessible to the service user. Use `npm ci` again to restore development tools after a production-only install. Startup never downloads browsers, invokes `sudo`, or contacts Yahoo for consent. Production runs `dist/main.js`; SIGTERM/SIGINT trigger Nest shutdown and browser cleanup.

## API

Default URL: `http://localhost:3000`. Responses preserve the existing field names; ticker symbols normalize to uppercase and metal names to lowercase. URL-encode path parameters.

| GET endpoint                 | Description                                                               |
| ---------------------------- | ------------------------------------------------------------------------- |
| `/`                          | Existing greeting: `stoXscaper API`                                       |
| `/asset/search/{term}`       | Search results with symbol, name, exchange, currency when known, and type |
| `/asset/quote/{symbol}`      | Market price, changes, and available quote metrics                        |
| `/asset/profile/{symbol}`    | Company information combined with its quote                               |
| `/asset/quote/metal/{metal}` | Gold or silver in EUR/USD/GBP per troy ounce and gram (31.1035 g/oz)      |

```bash
curl http://localhost:3000/asset/quote/AAPL
curl http://localhost:3000/asset/search/Apple
curl http://localhost:3000/asset/quote/metal/gold
```

- Invalid/empty/overlong inputs or unsupported metals: **400**.
- An empty Yahoo quote result: **404**.
- Network failures, upstream HTTP errors, bot challenges, malformed JSON, missing profiles or invalid price markup: **502**, never fabricated zero/NaN prices. Missing optional quote fields are omitted.
- Successful GET responses are cached per URL. Errors are not cached. Cache is in memory and is lost on restart; separate replicas have independent caches.

## Configuration

Copy `.env.example` to `.env` or supply process environment variables (which take precedence).

| Variable             | Default              | Meaning                                                                                     |
| -------------------- | -------------------- | ------------------------------------------------------------------------------------------- |
| `PORT`               | `3000`               | Integer from 1–65535                                                                        |
| `CACHE_TTL`          | `60000`              | Nonnegative safe integer in **milliseconds**; `0` means no expiration, not disabled caching |
| `YAHOO_COOKIES_PATH` | `yahoo-cookies.json` | Playwright cookie JSON file, relative to the working directory or absolute                  |
| `API_KEY`            | unset                | Used **only if** optional API-key middleware is explicitly enabled                          |

Invalid port/TTL values fail startup. Missing or malformed cookie files produce no saved session; malformed files log a warning. Legacy `YAHOO_COOKIE`, `YAHOO_USER_AGENT` and `COOKIE_EXPIRATION` variables are unused and can be removed. Start/production scripts already set the larger HTTP-header limit; no `NODE_OPTIONS` configuration is required for that.

### Access control

**The API is unauthenticated by default**, as before. Merely setting `API_KEY` does not enable authentication. To opt in, import `ApiKeyMiddleware` in `src/main.ts` and uncomment `app.use(new ApiKeyMiddleware().use)` before listening. Configure a strong `API_KEY` and send it in the `stoxscraper-api-key` header; missing configuration fails closed when the middleware is active.

`DomainRestrictionMiddleware` is also opt-in: import it in `src/main.ts`, replace its placeholder hostname allowlist, and enable the commented registration. It checks exact HTTP(S) hostnames. Origin/referer headers are spoofable and **not authentication**. CORS remains enabled; add deployment-specific origin restrictions and rate limits before public exposure. Do not expose an unrestricted browser-backed scraper directly to untrusted traffic.

## Quality and testing

```bash
npm run check             # lint, formatting, strict typecheck, build, coverage
npm run test:integration  # 64 offline integration cases
npm run test:unit         # 34 focused unit cases
npm test -- --runInBand   # all 98 cases
npm run test:watch
npm run lint:fix          # explicit opt-in source changes
npm run format            # explicit opt-in formatting
```

Tests follow the **testing trophy**: strict static checks, focused unit tests, and primarily integrations with actual Nest modules, HTTP routing, service logic, Cheerio parsing, caching, and browser lifecycle. Only external network/Chromium boundaries are replaced with deterministic adapters. No real browsers, credentials, live providers, or E2E tests are required for CI.

Jest runs with `--experimental-vm-modules` to consume Nest 12's ESM packages; the Node experimental warning is expected. The application itself keeps CommonJS output using NodeNext resolution. See [the testing guide](docs/TESTING.md) for coverage gates and how to add regressions.

CI runs clean installation, dependency-tree checks, all quality gates, coverage upload, security audits, and compiled imports with production-only dependencies. Dependabot proposes weekly dependency and action updates; it does not auto-merge them. See [upgrade and rollback guidance](docs/UPGRADING.md) and [the migration plan and results](MIGRATION_PLAN.md).

## Contributing

Use Node 24 LTS and `npm ci`, add offline regression coverage for changes, and run `npm run check` before opening a PR. Do not commit `.env`, cookies, browser downloads, coverage, or generated `dist/` output. Avoid forced dependency updates that violate peer requirements. All migration PRs require owner approval; none are automatically merged.
