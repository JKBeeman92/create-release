# Create Release Action

Creates a GitHub release using semver version data from the [PR Semver Labeler](https://github.com/jkbeeman92/semver-labeling) action. Can also be used standalone by deriving a tag from the PR title.

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
