# CLI clone-into-volume dev container

## Overview

This directory produces a **standalone** `devcontainer.json` for bringing up the
dev container with the [Dev Containers CLI](https://github.com/devcontainers/cli)
(`devcontainer up`) in a **clone-into-volume** setup: the sources are cloned into
a Docker named volume (`ssl-src`) instead of bind-mounting your host checkout.

It exists separately from the main [`../devenv.yaml`](../devenv.yaml)-generated
configs on purpose. The IntelliJ / VS Code "clone sources" actions orchestrate
clone-into-volume themselves (they create and own the sources volume, clone using
your host git credentials, and choose the workspace path). The plain
`devcontainer up` CLI does none of that, so it needs extra settings that the IDE
flow must **not** have (they would clash with the IDE's own paths and volume).
Keeping this in its own file leaves the IDE configs pristine.

The generated config layers these onto the devenv-generated
[`../user/devcontainer.json`](../user) (your personal config, with merged
plugins/extensions, dotfiles and container size):

- `workspaceMount` + `workspaceFolder` pointing at the `ssl-src` named volume
  (no host bind mount).
- SSH agent forwarding (`mounts` + `SSH_AUTH_SOCK`) so the in-container clone can
  authenticate to GitHub over SSH.
- An `onCreateCommand` prefix that `chown`s the root-owned volume and forwarded
  SSH socket to the container user, then clones the repo's default branch.
- A distinct container name (`support-service-lambdas-devcontainer-2`) so it
  coexists with any IDE-created container.

## How to build and test

Requires `mise` (for `devenv`), `node`, Docker Desktop running, and your SSH key
loaded (`ssh-add -l`).

```bash
# 1. Regenerate the pristine shared config, then build the CLI config from it:
devenv generate && node .devcontainer/cli/buildCliConfig.mjs

# 2. Bring up the container (clones sources into the ssl-src volume):
devcontainer up --workspace-folder . --config .devcontainer/cli/devcontainer.json

# 3. Open a shell inside:
devcontainer exec --workspace-folder . \
  --config .devcontainer/cli/devcontainer.json bash
```

Re-run step 1 whenever `../devenv.yaml` changes so this config stays in sync.

### Notes

- The clone runs **inside** the container against `origin`, so the container only
  ever has **pushed** commits (unlike the IDE flow, which can seed from your local
  working tree). It clones the repo's default branch.
- The `ssl-src` volume persists across rebuilds; the clone is skipped if it is
  already populated. To force a fresh clone: `docker volume rm ssl-src`.
- The forwarded socket path `/run/host-services/ssh-auth.sock` and its `chown` are
  specific to Docker Desktop on macOS.
- `.devcontainer/cli/devcontainer.json` is generated and git-ignored.

## References

- [Dev Containers CLI](https://github.com/devcontainers/cli)
- [devcontainer.json reference](https://containers.dev/implementors/json_reference/)
- [Guardian devenv](https://github.com/guardian/devenv)
