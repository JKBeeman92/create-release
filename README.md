# Create Release Action

Creates a GitHub release using semver version data from the [PR Semver Labeler](https://github.com/jkbeeman92/semver-labeling) action. Can also be used standalone by deriving a tag from the PR title.

Published on the GitHub Marketplace as `jkbeeman92/create-release`. Runs on Node 20 as an ES module; `node_modules` is committed directly (no bundling step), so what's on `main` is exactly what runs.

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `title` | ✅ | — | PR title, used as the human-readable release name |
| `token` | ✅ | — | GitHub token |
| `semver` | ❌ | `""` | Full semver string from the semver-labeling action (e.g. `2.3.1` or `2.3.1-beta.1`). When provided, used as the tag instead of deriving one from the title. |
| `semver_type` | ❌ | `""` | Release type from the semver-labeling action: `major`, `minor`, `patch`, or `pre-release`. Drives the prerelease flag on the GitHub release. |
| `tag_prefix` | ❌ | `v` | Prefix prepended to the semver tag (e.g. `v` produces `v2.3.1`). Only applies when `semver` is provided. |

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

- `index.js` is the entire action — no build step. After changing a
  dependency, run `npm install` and commit the resulting `node_modules`
  changes along with `package.json`/`package-lock.json`.
- There's no automated test suite; verify changes by running `index.js`
  directly with `INPUT_*` env vars. See `CLAUDE.md` for the full checklist.
- Branching: `main` is the release branch (tags are cut from here);
  `develop` is the integration branch; feature/fix work branches off
  `develop` and merges back via PR. See `CLAUDE.md` for details.
- Before merging a Dependabot PR, check whether the target version is a
  breaking major (this repo has been bitten by ESM-only major bumps in
  `@actions/core` and `@actions/github` before) — see `CLAUDE.md`.
