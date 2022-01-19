# variable-diff-action
An action intended to run on pull request and post a comment summarizing any changes to DevCycle variables.
## Usage
```yaml
on: pull_request

jobs:
  dvc-variable-diff:
    runs-on: ubuntu-latest
    name: Fetch DevCycle Variable Diff
    steps:
      - uses: DevCycleHQ/variable-diff-action@v1.0.0
        name: Execute DVC Action
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```
