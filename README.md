# `feature-flag-pr-insights-action`
Identifies changes in DevCycle Feature Flags within a PR, adds a comment to your PRs.

Note: This is intended for `pull_request` workflow events

## Usage
```yaml
on: pull_request

jobs:
  dvc-variable-diff:
    runs-on: ubuntu-latest
    steps:
      - uses: DevCycleHQ/variable-diff-action@v1.0.0
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| input | required | description |
| ----- | -------- | ----------- |
| `github-token` | yes | The GitHub Actions token e.g. `secrets.GITHUB_TOKEN` |

## Configuration
This action uses the [DevCycle CLI](https://github.com/DevCycleHQ/cli) under the hood.
See the [CLI configuration](https://github.com/DevCycleHQ/cli#configuration) for details on how to setup a config file.