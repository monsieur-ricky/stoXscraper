# Testing trophy

## Layers

1. **Static analysis:** ESLint 10 flat configuration, explicit promise handling, strict TypeScript 6, unused-code checks, and Prettier. `npm run check` is read-only apart from build/coverage artifacts; use `lint:fix` / `format` deliberately.
2. **Focused units:** configuration defaults/bounds, API key checks, exact domain matching, the existing greeting, and the production clock/timer boundary. Test isolated branches without launching a Nest application where no integration is needed.
3. **Integrations:** controller → service → real Yahoo/Cheerio parsing and Gold-API validation/conversion; the actual `AppModule` with HTTP routing, cache interceptor/Keyv expiry, error responses and real PlaywrightService lifecycle; Gold-API pacing, deduplication, cache expiry, malformed/expired quotes, timeouts and rate-limit cooldowns; and browser lifecycle/cookie failure tests. Replace external HTTP/Chromium and time boundaries, not business logic. Fixtures are synthetic, not captured credentials or real financial records.
4. **E2E: intentionally omitted.** The obsolete template was removed. No external financial website, installed browser, or consent flow participates in these suites.

`npm run test:integration` and `npm run test:unit` run each layer independently; `npm run test:cov -- --runInBand` measures the complete suite. Current validated counts/results are recorded per task in `MIGRATION_PLAN.md`.

## Coverage

- Global minimum: 90% statements, branches, functions and lines.
- Asset service: 95% statements/lines, 90% branches, 100% functions.
- Browser lifecycle service: 95% statements/lines, 85% branches, 100% functions.
- Gold-API service: 95% statements/lines, 90% branches, 100% functions.
- Coverage is reported by `npm run check`; see the migration log for the latest validated result. Compiler-emitted decorator metadata accounts for some uncovered branches.
- `src/main.ts` is excluded because it unconditionally starts a real browser/listener. Verify the compiled production entry point as an operational smoke check, not a mocked unit or E2E suite. `playwright-cookie-setup.mjs` is a separate opt-in live provisioning utility and not part of Jest coverage.

## Adding regressions

- Reproduce provider-shaped data using a small synthetic fixture in `test/fixtures.ts` or the relevant integration case.
- For a parsing/API regression, use the real modules and assert response status, key fields, and relevant browser calls. Test malformed responses as well as valid data; never accept missing prices as zero.
- For browser regressions, use `test/browser-harness.ts`. Assert contexts close on failure **and** success, and cookies are not used for requests that opt out.
- For metal-provider regressions, use `test/gold-api-harness.ts`: a synthetic native-fetch boundary and a virtual clock that advances request spacing without real sleeps. Assert USD/EUR/GBP identity and valid positive prices; do not replace GoldApiService with a canned business result.
- Keep network calls out of tests. Do not call live Yahoo/Gold-API or `cookies:setup` in CI.
- Always close Nest modules/apps and restore environment/time spies. Tests ignore `.env` under Jest's `NODE_ENV=test`. Cache expiration uses a scoped `Date.now` spy rather than flaky sleeps.

## Local operational smoke (optional)

Provision Chromium, build, start with `npm run start:prod`, request `GET /`, and stop with SIGTERM/SIGINT. This validates real framework/browser startup and teardown without relying on any financial provider. It is not an added E2E test. Repeat after runtime or Playwright upgrades and verify no browser processes/contexts remain after shutdown.
