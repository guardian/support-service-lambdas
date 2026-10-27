# Automated tool updates

[Update tool versions](update-tool-versions.yml) checks weekly for newer Node.js, pnpm, Corretto Java,
AWS CLI, and Guardian devenv releases and raises a PR with updates. Dependabot
can't currently update these pinned toolchain versions: see
[mise support](https://github.com/dependabot/dependabot-core/issues/12320) and
[packageManager support](https://github.com/dependabot/dependabot-core/issues/4830).

Updates stay within each tool's current major version. Major upgrades are manual: change the pinned
version and any corresponding runtime/CI settings together.

## About the generated PRs

Updates reject major version updates, prereleases and downgrades.

Once people pull the changes locally, mise will install and use new versions on next use.

CI Java is currently separate: `setup-java` selects latest Corretto 21 with `check-latest: true`,
so it may be newer than the pinned version.

## How to test the script and workflow

From the repository root, run offline tests (requires Bash, jq, GNU coreutils, and mise):

```bash
bash .github/scripts/updateToolVersions.test.sh
bash .github/scripts/publishToolVersions.test.sh
```

To discover real releases and update local pinned versions without creating a PR:

```bash
bash .github/scripts/updateToolVersions.sh
```

For an end-to-end test, push a branch with old pinned versions and select it under **Actions > Update
tool versions > Run workflow > Use workflow from**, or run:

```bash
gh workflow run update-tool-versions.yml --ref my-branch
```

A PR will be created on branch `automation/tool-versions-for/<target-branch>`, separate from normal
updates on `automation/tool-versions`.

To help with testing, every run refreshes the PR title and description, even if the selected
versions have not changed.

Before merging be sure to restore current
versions, and restore any temporarily disabled CI triggers before review.

## How to maintain the updater

pnpm's source of truth is `packageManager` in [`package.json`](../../package.json); the other pinned versions
live in [`mise.toml`](../../mise.toml). Both Node.js CI setup steps read `mise.toml` directly.

Edit [updateToolVersions.sh](../scripts/updateToolVersions.sh) to add a tool or change its release
policy, and extend [its offline tests](../scripts/updateToolVersions.test.sh). Shared mise-tool
updates use `updateMiseTool`; release discovery uses [`mise latest`](https://mise.jdx.dev/cli/latest.html).
Run the tests and ShellCheck after script changes, and actionlint after workflow changes.

Publication uses Git and the official [`gh` CLI](https://cli.github.com/manual/).
Its logic lives in [publishToolVersions.sh](../scripts/publishToolVersions.sh), with clearly headed log
sections and [offline tests](../scripts/publishToolVersions.test.sh) using local Git repositories
and a mocked `gh`. Version discovery and the Markdown job summary remain separate workflow steps;
the publication step receives the PAT.
An obsolete PR is closed when its target branch already has the selected versions.

## How to rotate the token

This isn't a proper bot (yet), it currently uses a personal access token. The original token expires
after one year, then the workflow will start failing silently.

The `TOOLCHAIN_UPDATE_TOKEN` Actions secret holds the token scoped to this repository
with **Contents: Read and write** and **Pull requests: Read and write**.

Create a replacement with the same permissions and
replace the secret under **Settings > Secrets and variables > Actions**. Verify it using an
end-to-end branch test that creates or updates a PR, then revoke the old token. A no-change run
does not exercise the token's push permissions.

Do not replace the PAT with `GITHUB_TOKEN`: its PRs generally do not trigger subsequent CI.
See [token permissions](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens)
and [workflow-triggering rules](https://docs.github.com/en/actions/how-tos/writing-workflows/choosing-when-your-workflow-runs/triggering-a-workflow#triggering-a-workflow-from-a-workflow).

## Troubleshoot a missing or failed update

Check **Actions > Update tool versions** for a recent successful weekly run. Its summary distinguishes
no updates, an existing update branch, newly pushed updates, and a closed obsolete PR. No new PR alone
does not mean the updater has stopped working.

**There is no team alert or watchdog configured.** Failures appear as red workflow runs; personal
notifications depend on GitHub settings. If scheduled runs stop altogether, there may be no failed
run to notice. Someone must check the run history periodically.

## Future work

- Use a proper bot rather than a time limited access token.
- Release cooldown support
- notifications on failures
- Work out if global pnpm registration and Corepack
  provisioning are still needed.
