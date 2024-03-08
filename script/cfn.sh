#!/usr/bin/env bash

set -e
set -x

pnpm i --frozen-lockfile
pnpm --filter cdk build
pnpm --filter cdk lint
pnpm --filter cdk test
pnpm --filter cdk synth
