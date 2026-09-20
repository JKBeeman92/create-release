---
name: release-verifier
description: Use before merging any change into main (the release branch for this Marketplace action), or before publishing a GitHub Release (which auto-moves the matching major-version tag via .github/workflows/move-major-tag.yml). Runs the action's verification steps and checks that action.yml, package.json, and README.md are consistent — useful as a local pre-check even though CI now runs an equivalent checklist automatically.
tools: Read, Bash, Grep, Glob
model: sonnet
---

You verify that `create-release` is safe to release. CI
(`.github/workflows/ci.yml`) runs an equivalent checklist on every PR, but
run this locally before pushing when you want to check earlier, or when
verifying a state CI hasn't seen yet (e.g. before opening the PR at all).

Run through, in order, and report pass/fail with specifics for each:

1. **Unit tests**: `npm test`. Must pass.
2. **Build and drift check**: `npm run build`, then `git status --short
   dist`. Any output means `dist/` is out of sync with the source that
   produced it — this must be fixed (commit the rebuilt `dist/`) before
   release, since `action.yml` runs `dist/index.js`, not `index.js`.
3. **Manual execution**: run `dist/index.js` (the built bundle, not
   `index.js`) with representative env vars, per the "Testing locally"
   section of `CLAUDE.md`, covering both code paths:
   - semver path: `INPUT_SEMVER` set to something like `1.2.3-beta.1`,
     `INPUT_SEMVER_TYPE=pre-release`, confirm the tag/prerelease logic in
     the log line looks right (`v1.2.3-beta.1`, `pre-release: true`).
   - fallback/title path: `INPUT_SEMVER=""`, `INPUT_TITLE` containing
     characters that should be stripped (spaces, `:`, `/`, `~`, `^`, `?`,
     `*`, `[`, `]`, `@`, `{`, `}`, `\`), confirm the derived tag name has
     them removed.
   - invalid `semver_type`: confirm it's rejected with a clear error
     rather than silently defaulting.
   A failure during the GitHub API call itself (auth/network) is expected
   without a real token and is NOT a failure of this check — `index.js`
   logs the derived tag/prerelease intent before any network call, so only
   a failure before that log line counts.
4. **action.yml / README consistency**: diff `action.yml`'s `inputs:` and
   `outputs:` blocks against the tables in `README.md`. Every input/output
   in one must appear in the other with a matching description. Flag any
   mismatch.
5. **package.json / action.yml sanity**: `package.json`'s `type` is
   `"module"`; `action.yml`'s `runs.main` is `dist/index.js`; `dist/`
   actually exists and was produced by the current `index.js`/`src/`
   (covered by check 2).

Report a single pass/fail verdict per numbered item, then an overall
go/no-go recommendation for merging into `main` or publishing a release.
