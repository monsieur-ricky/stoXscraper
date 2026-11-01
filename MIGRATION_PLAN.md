# Project modernization plan

## Scope and rules

- Use the existing `improvements/update-project` branch for the first PR, then stack task branches on their predecessor. Never merge any PR or change `main` without owner approval.
- Before **each** PR: clean install, read-only lint, formatting check, TypeScript check, build, and deterministic tests must pass. Record security audit results and any compatibility exceptions.
- Update this document whenever a task completes, including validation results and PR links. PRs must explain their dependency on earlier PRs.
- Follow the testing trophy: static analysis as the foundation, focused unit tests for isolated behavior, and primarily integration tests using real Nest modules, controllers, services, parsers, and caching. Mock only external browser/network boundaries. No E2E tests or live-provider dependency in CI.
- Never commit `.env`, cookies, credentials, browser downloads, or generated build artifacts.

## Initial review (2026-10-31)

- Clean checkout on `improvements/update-project`, starting at `841d8a4`; GitHub CLI authenticated; no open PRs.
- Existing dependencies include NestJS 11.1.9; npm's stable release is NestJS 12.3.2. Verify versions against npm when implementing rather than assuming the latest major.
- Node 24.11.1 / npm 11.6.2 available. Target supported Node 24 LTS.
- `npm ci --ignore-scripts`: 749 packages installed; **49 vulnerabilities (5 low, 24 moderate, 18 high, 2 critical)**.
- ESLint 9 is configured with obsolete `.eslintrc.js`; scripts mutate files on lint and perform privileged browser installation / live Yahoo consent on startup.
- Three template test files exist but do not cover scraping behavior; obsolete E2E scaffold expects the wrong greeting.
- Production entry point is incorrect (`dist/start`); a `src/...` runtime import will not resolve after compilation.
- Cache TTL fallback can produce `NaN`; browser contexts leak; malformed upstream payloads can silently yield invalid financial data. Middleware is disabled and optional: preserve that default, but test and correct its matching behavior.
- TypeScript 7.0.2 is latest, but typescript-eslint 8.72.1 requires TypeScript <6.1 and ts-jest 29.4.15 requires <7. Choose the newest **mutually supported** compiler, documenting the exception rather than forcing incompatible dependencies.

## Task 1 — Restore quality gates and establish regression baseline

Status: COMPLETE. Branch: `improvements/update-project`. PR: [#12](https://github.com/monsieur-ricky/stoXscraper/pull/12).

- [x] Capture current lint, build, and test failures.
- [x] Replace legacy ESLint config with flat config; make lint read-only; add format/typecheck/check scripts.
- [x] Add meaningful offline integration coverage for search, quotes, profiles, gold/silver parsing and controller wiring before runtime migration.
- [x] Remove the obsolete E2E scaffold; retain Supertest for subsequent HTTP integrations (not E2E-only).
- [x] Validate; publish PR against `main` immediately after committing this task.

## Task 2 — Upgrade framework, dependencies, and runtime

Status: COMPLETE. Branch: `improvements/update-project-dependencies` (stacked on task 1). PR: [#13](https://github.com/monsieur-ricky/stoXscraper/pull/13).

- [x] Upgrade Nest runtime/CLI/testing and all retained packages to current compatible stable versions; regenerate lockfile without forced peer overrides.
- [x] Remove unused Axios/HTTP and mapped-types dependencies and redundant Cheerio type stub; add declared cache peers as needed.
- [x] Pin Node/npm expectations and compatible TypeScript; adapt module resolution/build configuration.
- [x] Fix production startup, relative imports, shutdown hooks; make browser provisioning and cookie consent explicit opt-in setup commands, never privileged startup side effects.
- [x] Verify clean install, peer tree, audit, all quality gates, and real local application startup with Chromium (no financial-provider assertions).
- [x] Update this document; publish stacked PR immediately after committing.

## Task 3 — Harden migrated behavior with testing-trophy coverage

Status: COMPLETE. Branch: `improvements/update-project-regressions` (stacked on task 2). PR: [#14](https://github.com/monsieur-ricky/stoXscraper/pull/14).

- [x] Validate cache configuration and upstream data; encode URL inputs and reject unsupported metals without changing valid endpoint responses.
- [x] Guarantee browser/context cleanup on success/failure and test lifecycle, cookies, and selector behavior.
- [x] Test real Nest HTTP routing, error mapping, caching and TTL, using an in-process server and mocked external browser adapter (integration, not E2E).
- [x] Add isolated middleware security tests and strict static checks; enforce meaningful coverage thresholds weighted toward integrations.
- [x] Validate, update this document; publish stacked PR immediately after committing.

## Task 4 — CI, contributor docs, and migration handoff

Status: COMPLETE. Branch: `improvements/update-project-ci` (stacked on task 3). PR: [#15](https://github.com/monsieur-ricky/stoXscraper/pull/15).

- [x] Add GitHub Actions for reproducible install, static checks, build, coverage and production dependency audit; no live scraping or E2E.
- [x] Update README, environment example, testing strategy and upgrade/rollback instructions to match actual scripts and behavior.
- [x] Add dependency maintenance automation and verify configuration.
- [x] Run final clean-install gates, audit/outdated review, production smoke; record exact results, version exceptions, and external-service limitations.
- [x] Hosted CI passed; final stacked PR #15 published with approval/merge ordering. No merges performed.

## Validation log

Implementation results are appended per task. Live Yahoo/VeraCash availability, consent flows, and anti-bot policies are not deterministic tests and cannot be guaranteed by dependency upgrades.

### Task 1 results

- Baseline: build and three template tests passed; lint failed because ESLint 9 could not find a flat configuration.
- After changes: `npm ci` and `npm run check` passed (lint, formatting, typecheck, build, coverage).
- 7 tests passed, including 6 integration cases traversing controller → service → actual Cheerio parsing. Asset service line coverage: 97.53%; overall coverage is intentionally not gated until lifecycle/middleware/HTTP tests in task 3.
- Dependency audit remains at the recorded baseline of 49 findings; dependency/security remediation belongs to task 2. No production dependencies upgraded in this step.
- Applied consistent formatting to existing sources/docs/JSON so the new read-only formatting gate is reproducible.

### Task 2 results (2026-11-01)

- NestJS runtime/testing **12.3.2**, CLI **12.0.11**, schematics **12.0.12**, cache integration **12.0.2**, config **12.0.1**. All retained direct packages use current compatible stable releases.
- Target **Node 24 LTS >=24.15**, npm 11. Validated using separately provisioned **Node 24.22.2**, npm 11.6.2; system Node/default configuration unchanged. `.nvmrc` / `.node-version` select 24.
- Compatibility exceptions: **TypeScript 6.0.3** (Nest schematics peer requirement and parser/ts-jest support exclude latest TS 7); **@types/node 24.19.2** matches Node 24 rather than latest Node 26 types.
- Reviewed [Nest 11→12 migration guide](https://docs.nestjs.com/migration-guide): retained CommonJS output with NodeNext resolution, explicit compiler types/root directory and isolated module transforms. Jest requires `--experimental-vm-modules` for Nest 12 ESM dependencies; expected Node experimental warning is not suppressed.
- Removed unused Axios/HTTP, mapped-types, Cheerio type stub, ESLint/Prettier plugin, source-map-support, ts-node, ts-loader and direct tsconfig-paths dependencies. Cookie setup is plain ESM JavaScript with browser cleanup and restrictive new-file permissions.
- Fresh lockfile and `npm ci` pass without `--force`, legacy peer dependencies, or overrides. `npm ls --depth=0` and all `npm run check` gates pass; 7 tests passed.
- Real Chromium provisioned. Compiled `dist/main.js` starts, serves HTTP 200 with the existing greeting, and terminates on SIGTERM. No live Yahoo/VeraCash assertions or cookie setup performed.
- `npm audit --omit=dev`: **0 vulnerabilities**. Full audit: **31 development-only findings (4 low, 27 moderate), 0 high/critical**. Root advisories: deepmerge <=4.3.1 (no patched stable release), glob <=14.0.1 (patched 14 is outside Jest's compatible range), minimatch <11.0.1 (patched 11 is outside ESLint/CLI compatible ranges). Track upstream patches; do not accept npm's suggested obsolete Jest/Nest downgrades or force unsupported transitive major overrides. CI will block any high/critical development finding and every production finding.

### Task 3 results

- Environment validation converts PORT and CACHE_TTL to finite integers, provides defaults, rejects invalid configuration at startup, and injects TTL asynchronously after config is loaded. CACHE_TTL is milliseconds; zero retains cache-manager's no-expiry semantics.
- Financial requests encode search/ticker/crumb components independently. Valid responses retain their field names; uppercase metals normalize to lowercase. Unsupported inputs return 400; missing ticker results return 404; provider outages/challenges/malformed payloads return 502 without exposing URL/session secrets. Missing/ambiguous/invalid metal prices never become zero or NaN.
- Browser launch is injected at the external boundary. Real PlaywrightService lifecycle, navigation, selector waiting, status handling and context cleanup are exercised through Nest modules. Every request context closes on success or failure, including failures before page creation. Removed stale hardcoded browser identity and ignored headless override.
- Optional middleware remains disabled by default. When enabled, API keys fail closed and compare safely; domain restrictions parse exact hostnames instead of accepting substring-spoofed origins. Origin headers are not authentication.
- Enabled strict TypeScript, unused-code checks, no-explicit-any, and promise-safety lint rules.
- `npm ci`, `npm run check`, `npm run test:integration`, and `npm run test:unit` passed. **98 tests: 64 integration / 34 unit**, six suites. **100% statements/lines/functions, 95.55% branches** for measured application code. Main bootstrap is excluded from Jest coverage and explicitly smoke-checked as compiled code; cookie provisioning is an opt-in live operational utility, not a test target.
- Enforced 90% global coverage gates plus stricter service/lifecycle gates. Tests use synthetic provider documents and an injected Chromium adapter, not live sites or full E2E.
- Operational checks with real Chromium passed: local data URL navigation, selector wait, HTML extraction, zero remaining browser contexts; compiled production root returns HTTP 200; SIGTERM shutdown completes. Audits unchanged: zero production findings and zero full-tree high/critical findings.

### Task 4 results

- `npm ci`, `npm run check` (98 tests and coverage gates), `npm ls --depth=0`, and production audit passed on Node 24.22.2 / npm 11.6.2. `.npmrc` now rejects unsupported runtime engines during installation.
- `npm outdated --json` reports only the documented TypeScript 7 / Node 26 type exceptions; no retained dependency is behind its compatible wanted version.
- `actionlint` **1.7.12** validates `.github/workflows/ci.yml`; Dependabot configuration validates against SchemaStore's schema. Documented npm commands and local Markdown links resolve. Actions use verified current stable releases pinned by full commit SHA, read-only repository permissions, no persisted checkout credentials, execution timeouts, and limited coverage retention.
- Dependabot proposes grouped weekly Nest/tooling/compatible dependency updates and GitHub Action updates. TypeScript major and Node type major exclusions document compatibility decisions; no auto-merge workflow exists.
- CI performs a production-only clean install after quality gates and verifies compiled imports. Financial-provider access, browser downloads, cookies and E2E tests are absent from CI.
- Separate local production-only clean install: **135 packages**, **0 vulnerabilities**. Real compiled application/Chromium startup, HTTP 200 root and SIGTERM shutdown passed with no development dependencies. The development working directory was not pruned.
- README/environment example and `docs/TESTING.md` / `docs/UPGRADING.md` now describe actual setup, access-control defaults, errors, cache units, testing strategy, audit exceptions, upgrade/approval sequencing and rollback.
- Hosted Ubuntu CI [run 41252429413](https://github.com/monsieur-ricky/stoXscraper/actions/runs/41252429413) passed every step, including coverage upload, both security gates, and production-only compiled imports.
- No merges or deployments performed. Local `main` and `origin/main` remain at `841d8a4c4b45ad2a8fe93aa54b5411aa78c7233c`.

## Follow-up — live AAPL endpoint verification (2026-11-01)

Status: COMPLETE. Documentation update included in PR #15; no runtime code change required.

- Initially, cURL against `/asset/quote/AAPL` returned 502. Direct diagnosis confirmed Yahoo quote HTTP 401 and zero saved cookies loaded, rather than an application startup/build failure.
- Ran the project's existing **`npm run cookies:setup`** using the supported Node runtime, which created the local ignored `yahoo-cookies.json`. Restarted the compiled application to load that file.
- Ran `curl --silent --show-error --include --fail-with-body --max-time 90 http://localhost:3000/asset/quote/AAPL` against the actual API with real Chromium and live Yahoo requests. Result: **HTTP 200 OK**, **X-Cache: MISS**, `symbol: AAPL`, `name: Apple Inc.`, `currency: USD`, **price: 344.63**, `changeValue: -4.28`, `changePercent: -1.22668`. Response time header: `Sun, 01 Nov 2026 09:39:13 GMT`. This is a point-in-time provider quote, not a guarantee of future availability.
- No login was used. The setup script did not report clicking a consent prompt in this run. No cookie values or crumbs were logged or committed. A separate temporary diagnostic session was deleted; the standard setup file remains locally for subsequent use.
- Stopped test application processes with SIGTERM. Clarified README setup instructions: Yahoo quote/profile requests need a valid session, and the application must restart after cookie refresh. This remains a manual live operational check, not an E2E suite or CI dependency.

## Follow-up — live gold and silver endpoint verification (2026-11-01)

Status: TEST COMPLETED; live price retrieval BLOCKED by upstream Cloudflare protection. No runtime code change or protection bypass attempted.

- Started the compiled production application with real Chromium and used cURL against `http://localhost:3001/asset/quote/metal/gold` and `http://localhost:3001/asset/quote/metal/silver`.
- Both returned **HTTP 502 Bad Gateway**, `X-Cache: MISS`, and `{"message":"Financial provider request failed.","error":"Bad Gateway","statusCode":502}`. Response time headers: `Sun, 01 Nov 2026 09:50:09 GMT`.
- Direct Playwright navigation confirmed **HTTP 403**, `server: cloudflare`, and page title **Just a moment...** at both `https://www.veracash.com/gold-price-and-chart/` and `https://www.veracash.com/silver-price-and-chart/`. The expected `.wpb_wrapper` selector was absent.
- No real gold/silver price was obtained. The rejection occurs before price parsing; synthetic parser regression tests do not establish live provider availability. Yahoo cookie setup is unrelated because metal requests explicitly opt out of saved Yahoo cookies.
- Stopped the test application with SIGTERM and closed diagnostic browser contexts. No cookies, credentials, fabricated prices, or generated artifacts were committed. A provider-supported data source/access method would be needed if this protection persists; changing providers is outside this requested live check.

## Task 5 — Replace VeraCash with Gold-API spot prices

Status: COMPLETE. Branch: `improvements/update-project-gold-api` (stacked on PR #15). PR: ready to publish.

- [x] Replace VeraCash HTML parsing with direct HTTPS JSON requests to `api.gold-api.com`, with no extra packages, API keys, cookies or browser requests for metals.
- [x] Preserve gold/silver endpoints and existing USD/EUR/GBP ounce/gram response fields; validate positive prices, symbol/currency identity and provider timestamps.
- [x] Add a shared request queue (at most one upstream request per 1.1 seconds), minimum 30-second per-quote caching, concurrent-request deduplication and bounded network timeouts. Honor HTTP 429 `Retry-After` cooldowns; release unsuccessful response bodies. Keep tests offline by replacing only HTTP/time boundaries.
- [x] Replace obsolete metal HTML fixtures/tests and cover both metals, all currencies, conversion, malformed/error/stale responses, retries, cache expiry and concurrency. Preserve Yahoo regressions; no E2E tests.
- [x] Update README, provider documentation, testing/upgrade guides and this log.
- [x] Pass clean installation, lint, formatting, typecheck, build, coverage and audits; verify live gold/silver via the project's own API with cURL. Publish a separate stacked PR immediately after committing; do not merge.

### Task 5 results (2026-11-01)

- `GoldApiService` now fetches keyless HTTPS JSON from `/price/XAU/{USD,EUR,GBP}` and `/price/XAG/{USD,EUR,GBP}`. VeraCash request URLs, HTML parsing and metal HTML fixtures have been removed from runtime/tests. No dependency was added; Yahoo behavior and the seven-field metal response schema are preserved.
- Provider protection: 1.1-second request-start spacing shared across both metals/currencies, 30-second per-quote cache, in-flight deduplication, 10-second abort deadlines, rejected redirects, cancelled error bodies and HTTP 429 cooldowns (minimum 30 seconds, honoring longer numeric/date `Retry-After`). These controls are per process; multi-replica coordination is documented.
- Validation: exact symbol/currency, positive finite safely representable price, parseable source-fetch timestamp at most five minutes old / one minute ahead on receipt. No partial response, futures fallback or fabricated zero/stale price on failure; errors map to 502 and are not cached as quotes.
- `npm ci`, `npm run check`, `npm run test:integration`, `npm run test:unit`, `npm ls --depth=0`, documentation-script/link checks and `git diff --check` passed on Node 24.22.2 / npm 11.6.2. **138 tests: 103 integration / 35 unit**, eight suites, no E2E. Measured application coverage: **100% statements/lines/functions, 96% branches**. Gold-API adapter: **100% across all coverage metrics**; strict service-specific coverage gates added.
- `npm audit --omit=dev`: **0 findings**. Full audit remains **31 development-only findings (4 low, 27 moderate), 0 high/critical**, with the same documented upstream roots. Lockfile/dependency versions unchanged.
- Real cURL against the compiled public API returned HTTP 200 for both metals, with all six numeric price fields positive/finite. Gold: USD **3876.399902**, EUR **3471.7037522312**, GBP **2895.2830868038** per troy ounce; USD/EUR/GBP per gram **124.63 / 111.62 / 93.09**. Silver: USD **49.254002**, EUR **44.1118841912**, GBP **36.7878140938** per troy ounce; per gram **1.58 / 1.42 / 1.18**. Point-in-time response headers: **10:25:40 GMT** (gold), **10:25:43 GMT** (silver); a repeated gold request returned `X-Cache: HIT`.
- Isolated production-only install: **135 packages**, **0 vulnerabilities**. Repeated live cURL checks of both endpoints without any Yahoo cookie file returned HTTP 200 at **10:29:17 / 10:29:20 GMT** with the same values. Test application/browser processes shut down with SIGTERM; development dependencies and local Yahoo cookies were not modified.
- Updated README, `.env.example`, `docs/METALS.md`, testing/upgrade guides and this plan with provider identity/terms, spot-vs-futures semantics, conversion, error/freshness/cache behavior, rate limits and operational guidance. Historical VeraCash failure records are retained for context; the replacement resolves that specific blocker without bypassing protections.

## Review handoff

The original four implementation tasks and Gold-API follow-up are complete. Review the stacked PRs in order: **[#12](https://github.com/monsieur-ricky/stoXscraper/pull/12) → [#13](https://github.com/monsieur-ricky/stoXscraper/pull/13) → [#14](https://github.com/monsieur-ricky/stoXscraper/pull/14) → [#15](https://github.com/monsieur-ricky/stoXscraper/pull/15) → task 5 Gold-API PR**. Each targets its predecessor, starting with #12 against `main`. Owner approval is required before any merge. After approved merges, retarget/rebase remaining PRs carefully (especially after squash merges) and rerun CI. See `docs/UPGRADING.md` for rollback guidance.

Remaining limitations are explicit, not unfinished migration tasks: unsupported TypeScript 7 / Node 26 type upgrades are deferred; 31 low/moderate development-only audit findings await compatible upstream patches; live financial-provider consent/anti-bot availability is not guaranteed by the offline regression suite. Production dependencies have zero reported vulnerabilities.
