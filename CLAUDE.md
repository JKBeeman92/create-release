# create-release

A GitHub Action, published on the GitHub Marketplace as `jkbeeman92/create-release`,
that creates a GitHub Release from a pull request. It reads a PR title and,
optionally, semver output from the companion [`semver-labeling`](https://github.com/jkbeeman92/semver-labeling)
action to derive the release tag and prerelease flag.

## Architecture

- `index.js` — entry point: reads inputs, calls the GitHub API.
- `src/deriveRelease.js` — pure tag-derivation/validation logic, kept
  separate from `index.js` specifically so it's unit-testable without
  mocking the GitHub API.
- `test/deriveRelease.test.js` — unit tests (Node's built-in `node:test`
  runner, no test framework dependency). Run with `npm test`.
- `action.yml` — Action metadata (`runs.using: node20`, `runs.main:
  dist/index.js`).
- The action is **bundled with `ncc`** (`npm run build` → `dist/index.js`,
  `dist/package.json`, `dist/licenses.txt`). `node_modules/` itself is
  gitignored and never committed — only the bundle is. What's in
  `dist/index.js` at `main` HEAD is exactly what the Marketplace runtime
  executes. **After any change to `index.js`, `src/`, or a dependency, run
  `npm run build` and commit the resulting `dist/` changes** — CI fails the
  build if `dist/` doesn't match what a fresh build produces, but do this
  locally too rather than relying on CI to catch it.
- The package is an ES module (`"type": "module"` in `package.json`).
  `index.js` uses `import`, not `require`. This matters because both
  `@actions/core` (v3+) and `@actions/github` (v9+) are ESM-only —
  `require()`-based code fails with `ERR_REQUIRE_ESM` on those majors.
  `ncc` correctly detects and bundles ESM source (confirmed working with
  `@vercel/ncc` 0.45.0 against these exact dependencies).

## Marketplace implications

This action is consumed by other repositories via version tags
(e.g. `jkbeeman92/create-release@v1`). Treat `main` as the release branch:

- A broken commit on `main` at the tag consumers point to breaks every
  downstream workflow using this action, silently, on their next run.
- `.github/workflows/release.yml` publishes the release itself: on every PR
  merged into `main`, it runs this repo's own companion action
  ([`semver-labeling`](https://github.com/jkbeeman92/semver-labeling)) to
  parse the PR title, then `jkbeeman92/create-release@v1` — **the released
  `v1` tag, not `@main`/the working branch** — to publish the release. This
  is deliberately not self-referential in a circular way: the workflow runs
  on the merge commit and calls whatever `v1` currently points to (the
  *previous* release), so a change to this repo's own code that just
  merged into `main` is shipped by the old `v1` and only becomes part of
  `v1` itself after the tag-move step below runs.
- `.github/workflows/move-major-tag.yml` then force-moves the matching
  major tag (`v1`, `v2`, ...) to point at every published, non-prerelease,
  non-draft GitHub Release whose tag matches `vMAJOR.MINOR.PATCH`. This is
  the only thing that moves the major tag — merging to `main` alone does
  not; publishing a release (automatically, via `release.yml`, or
  manually) is what triggers it.
- Any dependency bump must be validated by actually running the bundle
  (see "Testing locally" below), not just by checking `npm install`
  succeeds. A clean install does not prove the runtime import graph still
  works — `npm run build` plus a manual run does.

## Branching strategy

- `main` — release branch. Tags are cut from here. Protected.
- `develop` — integration branch. Protected. All feature/fix branches branch
  from `develop` and merge back into `develop` via PR.
- `feature/*`, `fix/*` — short-lived branches off `develop` for individual
  changes.
- Releases: when `develop` is ready to ship, open a PR from `develop` into
  `main`. Merging that PR triggers `release.yml`, which publishes the
  release and (via `move-major-tag.yml`) moves the major tag — no separate
  manual release step.

### PR title conventions (enforced by CI's `pr-title` job)

- **PRs into `develop`**: title must follow [Conventional Commits](https://www.conventionalcommits.org/)
  — `type(scope)?: description`, e.g. `feat: add skip_existing input`,
  `fix(deps): bump @actions/core`, `feat!: breaking change`. Types:
  `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`,
  `revert`, `style`, `test`. This also applies to individual commits on a
  `feature/*`/`fix/*` branch, even though only the PR title is enforced by
  CI.
- **PRs into `main`** (i.e. `develop` → `main` release PRs): title must be
  a **versioned title**, `vX.Y.Z - description` or
  `vX.Y.Z-prerelease.N - description` (e.g. `v2.3.1 - new features`,
  `v2.3.1-beta.1 - beta release`). This is not just a convention —
  `semver-labeling` parses it to detect the version, and `create-release`
  uses it as the release name and (in its fallback path) the tag source.
  A PR into `main` with a non-versioned title will fail CI and, if merged
  anyway, will simply not trigger a release (`semver-labeling`'s `matched`
  output will be `false`).

Both `main` and `develop` are intended to be protected (PR required, no
direct pushes, status checks green before merge) — see the repo's branch
protection settings in GitHub (not configurable via the tools available to
Claude Code sessions; must be set in Settings → Branches).

## Dependency upgrades / Dependabot

`@actions/core` and `@actions/github` both went ESM-only at v3 and v9
respectively. **Do not merge a Dependabot PR on this repo without checking
whether the target major version is ESM-only or otherwise has a documented
breaking change** — check the package's `RELEASES.md`/changelog first.
If it is a breaking major:
1. Do not merge the Dependabot PR directly.
2. Make the required code changes on a branch off `develop`, bump the
   dependency there, run `npm install` (regenerates `package-lock.json`;
   `node_modules` is gitignored, nothing to commit there) and `npm run
   build` (regenerates `dist/`), and verify per "Testing locally".
3. Close the superseded Dependabot PR(s) with a comment pointing at the
   PR that landed the change.

Minor/patch bumps are generally safe to merge as Dependabot proposes them,
but still run `npm install && npm test && npm run build` and verify per
"Testing locally" before merging — Dependabot bumps `package.json` but
won't rebuild `dist/` for you.

The `dependency-upgrade-reviewer` subagent (`.claude/agents/`) automates
the changelog/breaking-change check described above.

## Testing locally

```bash
npm test                # unit tests for src/deriveRelease.js
npm run build            # produces dist/index.js
node --check dist/index.js
INPUT_TITLE="v1.2.3 - test release" \
INPUT_TOKEN="<a real token if testing against a real repo, else any string>" \
INPUT_SEMVER="" \
INPUT_SEMVER_TYPE="" \
INPUT_TAG_PREFIX="v" \
INPUT_SKIP_EXISTING="false" \
GITHUB_REPOSITORY="owner/repo" \
node dist/index.js
```

Inputs are read via `INPUT_<NAME>` env vars (GitHub Actions' own convention
for `core.getInput`). Without a real token this will fail at the
`getReleaseByTag`/`createRelease` API call with an auth error — that's
expected and still proves imports and tag-name logic work, because
`index.js` logs the derived tag/prerelease intent *before* making any
network call. Only a failure before that log line (`ERR_REQUIRE_ESM`,
`Cannot find module`, a thrown validation error with the wrong message,
etc.) indicates a real regression.

The `release-verifier` subagent (`.claude/agents/`) runs this full
checklist plus the `action.yml`/README consistency check.

## Making changes

- Keep the pure logic in `src/deriveRelease.js` unit-tested; keep
  `index.js` as thin I/O glue around it.
- Any change to `action.yml` inputs/outputs must be reflected in
  `README.md`'s input/output tables (CI checks this).
- Update `README.md` usage examples if behavior changes.
- Rebuild `dist/` (`npm run build`) and commit it with every change that
  touches `index.js`, `src/`, or a dependency — CI enforces this but treat
  it as your own responsibility, not a safety net.
