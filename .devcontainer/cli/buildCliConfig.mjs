#!/usr/bin/env node
// Builds a standalone devcontainer.json for the `devcontainer up` CLI
// clone-into-volume flow, by layering CLI-specific settings on top of the
// devenv-generated *user* config (which includes your personal preferences:
// merged plugins/extensions, dotfiles, container size).
//
// Why this exists: the IDE actions ("Create Dev Container and Clone Sources" /
// "Clone Repository in Container Volume") orchestrate clone-into-volume
// themselves (create + own the sources volume, clone with host credentials,
// set the workspace folder). The plain `devcontainer up` CLI does none of that
// - it just runs `docker run` plus the lifecycle hooks from the config - so the
// CLI needs extra config the IDE flow must NOT have (it would clash with the
// IDE's own paths/volume). We keep devenv.yaml/shared pristine for the IDE and
// generate this separate file for the CLI.
//
// Regenerate with:  devenv generate && node .devcontainer/cli/buildCliConfig.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const cliDir = dirname(fileURLToPath(import.meta.url));
const userPath = join(cliDir, '..', 'user', 'devcontainer.json');
const outPath = join(cliDir, 'devcontainer.json');

const name = 'support-service-lambdas-devcontainer-2';
const workspaceFolder = '/workspaces/support-service-lambdas';
const repo = 'git@github.com:guardian/support-service-lambdas.git';
const sshSock = '/ssh-agent';

const config = JSON.parse(readFileSync(userPath, 'utf8'));

// Put the sources in a named volume instead of bind-mounting the host checkout.
config.workspaceMount = `source=ssl-src,target=${workspaceFolder},type=volume`;
config.workspaceFolder = workspaceFolder;

// Forward the host SSH agent so the in-container clone can auth to GitHub.
// /run/host-services/ssh-auth.sock is Docker Desktop's SSH agent socket on macOS.
config.containerEnv = { ...(config.containerEnv ?? {}), SSH_AUTH_SOCK: sshSock };
config.mounts = [
  ...(config.mounts ?? []),
  `source=/run/host-services/ssh-auth.sock,target=${sshSock},type=bind`,
];

// Distinct container name so it coexists with the IDE-created container.
config.runArgs = [
  ...(config.runArgs ?? []).filter((a) => !a.startsWith('--name=')),
  `--name=${name}`,
];

// Clone the sources into the (root-owned, empty) volume before the rest of
// onCreate runs. chown the workspace and the forwarded SSH socket to the
// container user first (both come up owned by root). Guarded so re-runs on an
// existing volume are a no-op.
const cloneCmd =
  `sudo chown "$(id -un)":"$(id -gn)" ${workspaceFolder} && ` +
  `sudo chown "$(id -un)" "$SSH_AUTH_SOCK" && ` +
  `if [ ! -d ${workspaceFolder}/.git ]; then ` +
  `GIT_SSH_COMMAND="ssh -o StrictHostKeyChecking=accept-new" ` +
  `git clone ${repo} ${workspaceFolder}; fi`;
config.onCreateCommand = config.onCreateCommand
  ? `${cloneCmd} && ${config.onCreateCommand}`
  : cloneCmd;

writeFileSync(outPath, `${JSON.stringify(config, null, 2)}\n`);
console.log(`Wrote ${outPath}`);
