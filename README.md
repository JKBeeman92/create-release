# Create Release Action

This action creates a release with a tag equal to the PR title with spaces and other invalid characters removed.

## Inputs

### `title`

**Required** The title of the PR. Default `" "`.

### `token`

**Required** The GitHub token. Default `" "`.

## Outputs

None.

## Example usage

```yaml
uses: actions/create-release@v1
with:
  title: ${{ github.event.pull_request.title }}
  token: ${{ secrets.GITHUB_TOKEN }}
