#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
(cd $DIR && npm install && npm run build && cdk synth > ../cfn.yaml)
