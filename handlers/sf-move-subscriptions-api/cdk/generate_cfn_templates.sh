#!/usr/bin/env bash

set -e
npm install

npm run build
stack_param=sf-move-subscriptions-api
stack=$stack_param npm run synth

if [[ -s ../cfn.yaml ]]
then
	printf "Successfully synthesized of $stack_param stack to ../cfn.yaml file"
else
	printf "ERROR: synthesized of $stack_param stack to ../cfn.yaml file failed"
    printf 1
fi
