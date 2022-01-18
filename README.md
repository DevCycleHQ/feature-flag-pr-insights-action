# variable-diff-action
An action intended to run on pull request and post a comment summarizing any changes to DevCycle variables.
## Usage
```yaml
on: pull_request

jobs:
  dvc-variable-diff:
    runs-on: ubuntu-latest
    name: Fetch DevCycle variable diff
    steps:
      - uses: actions/checkout@v2
        with:
          repository: DevCycleHQ/variable-diff-action
      - uses: ./
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```