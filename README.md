# Create Release Action

Creates a GitHub release using semver version data from the [PR Semver Labeler](https://github.com/jkbeeman92/semver-labeling) action. Can also be used standalone by deriving a tag from the PR title.

Published on the GitHub Marketplace as `jkbeeman92/create-release`. Runs on Node 20 as an ES module; the action is bundled with [`ncc`](https://github.com/vercel/ncc) into `dist/index.js`, which is what `action.yml` actually runs.

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `title` | ✅ | — | PR title, used as the human-readable release name |
| `token` | ✅ | — | GitHub token |
| `semver` | ❌ | `""` | Full semver string from the semver-labeling action (e.g. `2.3.1` or `2.3.1-beta.1`). When provided, used as the tag instead of deriving one from the title. |
| `semver_type` | ❌ | `""` | Release type from the semver-labeling action: `major`, `minor`, `patch`, or `pre-release`. Drives the prerelease flag on the GitHub release. |
| `tag_prefix` | ❌ | `v` | Prefix prepended to the semver tag (e.g. `v` produces `v2.3.1`). Only applies when `semver` is provided. |
| `skip_existing` | ❌ | `false` | If a release for the derived tag already exists, skip it and succeed instead of failing. |

## Outputs

| Output | Description |
|---|---|
| `release_url` | URL of the created GitHub release |
| `tag_name` | The tag name used for the release |

## Usage with semver-labeling (recommended)

```yaml
on:
  pull_request:
    types: [closed]

jobs:
  release:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - name: Detect and label semver
        id: semver
        uses: jkbeeman92/semver-labeling@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Create release
        if: steps.semver.outputs.matched == 'true'
        uses: jkbeeman92/create-release@v1
        with:
          title: ${{ github.event.pull_request.title }}
          semver: ${{ steps.semver.outputs.semver }}
          semver_type: ${{ steps.semver.outputs.semver_type }}
          token: ${{ secrets.GITHUB_TOKEN }}
```

With a PR titled `v2.3.1 - new features`, this will:
- Create a release tagged `v2.3.1`
- Name the release `v2.3.1 - new features`
- Mark it as a full release (not a prerelease)

With a PR titled `v2.3.1-beta.1 - beta release`:
- Creates a release tagged `v2.3.1-beta.1`
- Marks it as a **prerelease** automatically

## Standalone usage (no semver-labeling)

If used without the semver-labeling action, the tag is derived from the PR title by stripping characters that are invalid in git tags.

```yaml
- uses: jkbeeman92/create-release@v1
  with:
    title: ${{ github.event.pull_request.title }}
    token: ${{ secrets.GITHUB_TOKEN }}
```

## Development

- Source lives in `index.js` (entry point) and `src/deriveRelease.js` (the
  tag-derivation/validation logic, kept separate so it's unit-testable).
  `dist/index.js` is the built bundle that `action.yml` actually runs —
  after changing `index.js`, `src/`, or a dependency, run `npm run build`
  and commit the resulting `dist/` changes. `node_modules` itself is
  **not** committed (see `.gitignore`); only the bundle is.
- Unit tests: `npm test` (Node's built-in test runner, no extra
  dependencies). Covers the tag-derivation logic in `src/deriveRelease.js`.
- CI (`.github/workflows/ci.yml`) runs the tests, rebuilds the bundle and
  fails if `dist/` doesn't match what's committed, and exercises both the
  semver and title-fallback code paths end-to-end.
- Branching: `main` is the release branch (tags are cut from here);
  `develop` is the integration branch; feature/fix work branches off
  `develop` and merges back via PR. See `CLAUDE.md` for details.
- PR title conventions (enforced by CI): PRs into `develop` follow
  [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat: ...`, `fix: ...`, etc.); PRs into `main` use a versioned title
  (`vX.Y.Z - description`), since that's what drives the release below.
  See `CLAUDE.md` for the full convention.
- Before merging a Dependabot PR, check whether the target version is a
  breaking major (this repo has been bitten by ESM-only major bumps in
  `@actions/core` and `@actions/github` before) — see `CLAUDE.md`.

## Versioning

This repo releases itself with itself: `.github/workflows/release.yml`
runs on every PR merged into `main`, uses
[`semver-labeling`](https://github.com/jkbeeman92/semver-labeling) to
parse the (versioned) PR title, and calls this repo's own released
`create-release@v1` action to publish the GitHub Release — no manual
release step. `.github/workflows/move-major-tag.yml` then force-moves that
release's major version tag (`v1`, `v2`, ...) to point at it, so consumers
pinned to `@v1` always resolve to the latest non-prerelease `v1.x.y`.
