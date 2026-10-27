# Automated tool updates

[Update tool versions](update-tool-versions.yml) runs weekly and can also be started manually with
GitHub Actions. It opens or refreshes one PR for Node.js, pnpm, Corretto Java, AWS CLI, and Guardian
devenv. The updater preserves each tool's current major version and rejects prereleases and
downgrades. Guardian devenv uses timestamped releases rather than semantic versions.
The sbt launcher stays at `latest`; project sbt versions in `project/build.properties` are unchanged.

pnpm is pinned in [`package.json`](../../package.json), and the other four tools in
[`mise.toml`](../../mise.toml). Both Node.js CI setup steps read the pin directly from `mise.toml`.
Java's exact pin is for local development only: Scala CI,
Scala Steward CI, and dependency-graph submission use `setup-java` with Corretto 21 and
`check-latest: true` to select the newest available build on each run. This avoids installing mise
or development-only tools in build jobs. CI can therefore use a newer Java patch than local development.
mise automatically installs missing required versions and does not fall back to system executables.
Already-running JVMs and IDE backends still need restarting after a Java update.

## Setup

Before enabling the workflow, configure the repository secret `TOOLCHAIN_UPDATE_TOKEN` with a
personal access token (from your account or a bot account) authorized to write repository contents
and pull requests. Unlike PRs created
using `GITHUB_TOKEN`, PRs opened with this token trigger normal CI. The updater never merges its PR.
See [GitHub's workflow-triggering rules](https://docs.github.com/en/actions/how-tos/writing-workflows/choosing-when-your-workflow-runs/triggering-a-workflow#triggering-a-workflow-from-a-workflow)
and [fine-grained personal access token permissions](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens).

The workflow uses Git and GitHub's official [`gh` CLI](https://cli.github.com/manual/) to maintain
an update branch and its PR. Scheduled runs target the default branch and use `automation/tool-versions`.
Manual runs target the selected branch; non-default targets use `automation/tool-versions-for/<target-branch>`
so they cannot overwrite the normal update branch. Runs targeting different branches have separate
concurrency groups. Identical file trees do not create another commit.
An existing PR's description is refreshed only when new changes are pushed; an existing branch
without an open PR can still have a new PR created.
Branch updates use an explicit force-push lease to reject concurrent changes, and an existing PR is
closed if the target branch already contains the selected versions.

Commits use `update-tool-versions automation` as both author and committer, with the non-deliverable
placeholder email `update-tool-versions@automation.invalid`; no mailbox needs provisioning.
The PR and push are attributed to the account owning the token.

## Testing against a branch

Push a branch containing the workflow and older exact tool pins. In Actions, select **Update tool
versions**, choose **Run workflow**, and select that branch under **Use workflow from**. Alternatively:

```bash
gh workflow run update-tool-versions.yml --ref my-toolchain-test
```

The workflow checks out that branch and opens its update PR against it, not against the default
branch. Repeated runs reuse the branch-specific update PR. Tags are rejected.

GitHub requires the workflow to exist on the default branch before it can receive manual dispatches.
A new workflow present only on a feature branch cannot be manually dispatched yet; first register
the workflow on the default branch, or use a temporary branch-specific push trigger for an initial
pre-merge test. See [manually running a workflow](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow).

## Local testing

To test locally without network access (requires Bash, jq, GNU coreutils, and mise), run from the
repository root:

```bash
bash .github/scripts/updateToolVersions.test.sh
```

To resolve real releases and update local files without opening a PR:

```bash
bash .github/scripts/updateToolVersions.sh
```

Release discovery uses [`mise latest`](https://mise.jdx.dev/cli/latest.html); it does not install the
candidate tools. After pulling a merged update, mise shims select the new pins on the next invocation.

The script updates `package.json`, then the tools in `mise.toml`. A failure stops the script
and fails the workflow before any commit, push, or PR publication. When running locally, earlier
updates can remain in the working tree if a later tool fails.
