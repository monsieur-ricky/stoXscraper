# Testing trophy

## Layers

1. **Static analysis:** ESLint 10 flat configuration, explicit promise handling, strict TypeScript 6, unused-code checks, and Prettier. `npm run check` is read-only apart from build/coverage artifacts; use `lint:fix` / `format` deliberately.
2. **Focused units (34):** configuration defaults/bounds, API key checks, exact domain matching, and the existing greeting. Test the isolated branches without launching a Nest application where no integration is needed.
3. **Integrations (64):** controller → service → real Cheerio parser tests; the actual `AppModule` with HTTP routing, cache interceptor/Keyv expiry, error responses, and real PlaywrightService lifecycle; and provider lifecycle/cookie failure tests. Replace the external Chromium launcher rather than the business logic. Fixtures are synthetic, not captured credentials or real financial records.
4. **E2E: intentionally omitted.** The obsolete template was removed. No external financial website, installed browser, or consent flow participates in these suites.

The current suite has 98 cases in six suites. `npm run test:integration` and `npm run test:unit` run each layer independently; `npm run test:cov -- --runInBand` measures the complete suite.

## Coverage

- Global minimum: 90% statements, branches, functions and lines.
- Asset service: 95% statements/lines, 90% branches, 100% functions.
- Browser lifecycle service: 95% statements/lines, 85% branches, 100% functions.
- Current measured result: 100% statements/lines/functions, 95.55% branches. Compiler-emitted decorator metadata accounts for some uncovered branches.
- `src/main.ts` is excluded because it unconditionally starts a real browser/listener. Verify the compiled production entry point as an operational smoke check, not a mocked unit or E2E suite. `playwright-cookie-setup.mjs` is a separate opt-in live provisioning utility and not part of Jest coverage.

## Adding regressions

- Reproduce provider-shaped data using a small synthetic fixture in `test/fixtures.ts` or the relevant integration case.
- For a parsing/API regression, use the real modules and assert response status, key fields, and relevant browser calls. Test malformed responses as well as valid data; never accept missing prices as zero.
- For browser regressions, use `test/browser-harness.ts`. Assert contexts close on failure **and** success, and cookies are not used for requests that opt out.
- Keep network calls out of tests. Do not call live Yahoo/VeraCash or `cookies:setup` in CI.
- Always close Nest modules/apps and restore environment/time spies. Tests ignore `.env` under Jest's `NODE_ENV=test`. Cache expiration uses a scoped `Date.now` spy rather than flaky sleeps.

## Local operational smoke (optional)

Provision Chromium, build, start with `npm run start:prod`, request `GET /`, and stop with SIGTERM/SIGINT. This validates real framework/browser startup and teardown without relying on any financial provider. It is not an added E2E test. Repeat after runtime or Playwright upgrades and verify no browser processes/contexts remain after shutdown.
