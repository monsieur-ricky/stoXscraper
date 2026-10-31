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

Status: COMPLETE. Branch: `improvements/update-project-regressions` (stacked on task 2). PR: ready to publish.

- [x] Validate cache configuration and upstream data; encode URL inputs and reject unsupported metals without changing valid endpoint responses.
- [x] Guarantee browser/context cleanup on success/failure and test lifecycle, cookies, and selector behavior.
- [x] Test real Nest HTTP routing, error mapping, caching and TTL, using an in-process server and mocked external browser adapter (integration, not E2E).
- [x] Add isolated middleware security tests and strict static checks; enforce meaningful coverage thresholds weighted toward integrations.
- [x] Validate, update this document; publish stacked PR immediately after committing.

## Task 4 — CI, contributor docs, and migration handoff

Status: PENDING. Branch: `improvements/update-project-ci` (stacked on task 3). PR: pending.

- [ ] Add GitHub Actions for reproducible install, static checks, build, coverage and production dependency audit; no live scraping or E2E.
- [ ] Update README, environment example, testing strategy and upgrade/rollback instructions to match actual scripts and behavior.
- [ ] Add dependency maintenance automation and verify configuration.
- [ ] Run final clean-install gates, audit/outdated review, production smoke; record exact results, version exceptions, and external-service limitations.
- [ ] Open final stacked PR and provide all links and approval/merge ordering. Do not merge.

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
