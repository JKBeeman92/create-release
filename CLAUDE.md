# create-release

A GitHub Action, published on the GitHub Marketplace as `jkbeeman92/create-release`,
that creates a GitHub Release from a pull request. It reads a PR title and,
optionally, semver output from the companion [`semver-labeling`](https://github.com/jkbeeman92/semver-labeling)
action to derive the release tag and prerelease flag.

## Architecture

- `index.js` — the entire action. No `src/`, no build step.
- `action.yml` — Action metadata (`runs.using: node20`, `runs.main: index.js`).
- `node_modules/` is **committed directly** — there is no `ncc`/`esbuild` bundling
  step. What's on disk in `node_modules/` at `main` HEAD is exactly what the
  Marketplace runtime executes. After any `npm install`/`npm update`, the
  changed `node_modules/` files must be committed alongside `package.json` and
  `package-lock.json`.
- The package is an ES module (`"type": "module"` in `package.json`).
  `index.js` uses `import`, not `require`. This matters because both
  `@actions/core` (v3+) and `@actions/github` (v9+) are ESM-only —
  `require()`-based code will fail with `ERR_REQUIRE_ESM` on those majors.

## Marketplace implications

This action is consumed by other repositories via version tags
(e.g. `jkbeeman92/create-release@v1`). Treat `main` as the release branch:

- A broken commit on `main` at the tag consumers point to breaks every
  downstream workflow using this action, silently, on their next run.
- Major-version tags (`v1`, `v2`, ...) should be moved forward deliberately
  after a real release, not on every merge — check whether `v1` is a branch,
  a moving tag, or a release before repointing it.
- Any dependency bump must be validated by actually running `index.js`
  (see "Testing locally" below), not just by checking `npm install` succeeds.
  A clean install does not prove the runtime import graph still works.

## Branching strategy

- `main` — release branch. Tags are cut from here. Protected.
- `develop` — integration branch. Protected. All feature/fix branches branch
  from `develop` and merge back into `develop` via PR.
- `feature/*`, `fix/*` — short-lived branches off `develop` for individual
  changes.
- Releases: when `develop` is ready to ship, open a PR from `develop` into
  `main`. Merging that PR is what triggers a new tagged release.

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
2. Make the required code changes (e.g. ESM conversion) on a branch off
   `develop`, bump the dependency there, regenerate `node_modules` +
   `package-lock.json` with `npm install`, and verify per "Testing locally".
3. Close the superseded Dependabot PR(s) with a comment pointing at the
   PR that landed the change.

Minor/patch bumps are generally safe to merge as Dependabot proposes them,
but still worth a quick `npm install && node --check index.js` before
merging.

## Testing locally

There is no test suite (`npm test` is a placeholder). To validate a change
to `index.js` or a dependency bump:

```bash
node --check index.js   # syntax / module-loading sanity check
INPUT_TITLE="v1.2.3 - test release" \
INPUT_TOKEN="<a real token if testing against a real repo, else any string>" \
INPUT_SEMVER="" \
INPUT_SEMVER_TYPE="" \
INPUT_TAG_PREFIX="v" \
GITHUB_REPOSITORY="owner/repo" \
node index.js
```

Inputs are read via `INPUT_<NAME>` env vars (GitHub Actions' own convention
for `core.getInput`). Without a real token this will fail at the API call
with an auth error — that's expected and still proves imports and tag-name
logic work; only failures during module loading (`ERR_REQUIRE_ESM`,
`Cannot find module`, etc.) indicate a real regression at that stage.

## Making changes

- Keep `index.js` dependency-light and single-file unless a change genuinely
  requires more structure — this is a small, focused action.
- Any change to `action.yml` inputs/outputs must be reflected in `README.md`'s
  input/output tables.
- Update `README.md` usage examples if behavior changes.
