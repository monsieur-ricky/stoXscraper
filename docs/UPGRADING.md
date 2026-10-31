# Dependency upgrades and deployment

## Current compatibility decisions

- Node 24 LTS >=24.15 (latest patch recommended), npm 11. Nest runtime can run on older Node releases, but the latest schematics need a newer runtime and Jest's Nest 12 ESM support needs Node >=24.9.
- Nest core/platform/common/testing: 12.3.2. Companion integrations and CLI are on their current 12.x releases.
- TypeScript **6.0.3**, not latest 7.x: Nest schematics requires 6, typescript-eslint supports <6.1, and ts-jest supports <7. Remove the temporary major-update exclusion only after all those peers support the new compiler.
- `@types/node` **24.19.2**, intentionally matched to runtime APIs rather than Node 26 types. Update it alongside a deliberate runtime migration.
- CommonJS application output is retained. NodeNext resolution, explicit compiler types and isolated transforms accommodate Nest 12 ESM dependencies. Do not remove Jest's VM-module flag without validating that ESM loading still works.

## Upgrade checklist

1. Review the [Nest migration guide](https://docs.nestjs.com/migration-guide), release notes, engine and peer requirements. Upgrade related Nest packages together; check tooling compatibility before changing TypeScript.
2. Use a branch and commit the dependency manifest and regenerated lockfile together. Never use `--force` / `--legacy-peer-deps` to conceal incompatible peers. Never use `npm audit fix --force` blindly.
3. Run `npm ci`, `npm ls --depth=0`, `npm run check`, `npm audit --omit=dev`, and `npm audit --audit-level=high` on the supported runtime.
4. Inspect `npm outdated`: exceptions must be explained, not ignored. Update the existing migration/maintenance record with exact versions and results.
5. Reinstall Playwright Chromium with `npm run browser:install` (and system libraries at provisioning time if needed). Browser revisions must match the locked Playwright release.
6. Build and check a **production-only** installation. `npm run start:prod` must run with no dev dependencies; it must not install browsers, invoke sudo, require ts-node, or require live Yahoo access to start.
7. Verify local `GET /`, shutdown signals and browser cleanup. Live-provider smoke requests are optional, manual and subject to provider terms; deterministic tests do not establish current live scraping availability.
8. Submit a PR only after local gates pass. Require review/approval and green CI; do not auto-merge. No deployment or merge-to-main is part of the automated migration.

## Security audit exception (2026-11-01)

Production audit: **zero findings**. Full dependency audit: **31 development-only findings (4 low, 27 moderate), no high/critical**. Three upstream roots propagate across the tooling tree:

| Root                | Advisory                                                                 | Why retained / follow-up                                                             |
| ------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `deepmerge` <=4.3.1 | [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) | Latest stable release is affected; await Jest/upstream replacement or patch.         |
| `glob` <=14.0.1     | [GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) | Patched 14.x is outside current Jest/test-exclude ranges; await compatible releases. |
| `minimatch` <11.0.1 | [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) | Patched 11.x is outside current ESLint/CLI/parser ranges; await compatible releases. |

These packages operate on repository/build/test inputs, not deployed scraper requests. Build only trusted code; never pass untrusted glob patterns/configuration to tooling. This is a residual risk, not a clean full audit. Review weekly via Dependabot/upstream releases and on each upgrade. Avoid npm's suggested obsolete Jest/Nest downgrades or untested cross-major overrides. CI blocks **all** production findings and **high/critical** findings across the full tree. No advisory is hidden or blanket-ignored.

## Approval and rollback

Review the four migration PRs in order: [#12](https://github.com/monsieur-ricky/stoXscraper/pull/12) → [#13](https://github.com/monsieur-ricky/stoXscraper/pull/13) → [#14](https://github.com/monsieur-ricky/stoXscraper/pull/14) → the final CI/docs PR listed in `MIGRATION_PLAN.md`. They are stacked against their predecessor. After owner approval, retarget subsequent PRs to `main` as appropriate; if squash-merging, rebuild/rebase each remaining diff carefully and rerun CI rather than merging stale cumulative diffs.

For deployment rollback, redeploy the previously approved immutable application artifact **with its matching lockfile, Node runtime and Playwright browser revision**. No database migrations are involved. In-memory cache may be discarded on restart; local cookies are secrets and must not be committed or bundled into public artifacts. If a code rollback is needed after approved merges, propose a reviewed revert PR; never force-reset `main`. The pre-migration reference is `841d8a4`, but it has known vulnerable dependencies and should not be used as a long-term deployment target.
