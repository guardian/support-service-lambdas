#!/usr/bin/env bash

set -e
set -x

CDK_DIR=$1
DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
ROOT_DIR="${DIR}/.."
cd "$ROOT_DIR/$CDK_DIR"

yarn install --frozen-lockfile
yarn tsc
yarn lint
yarn test
yarn synth
