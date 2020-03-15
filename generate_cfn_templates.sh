#!/usr/bin/env bash

set -e



build_cfn_template() {
    stack_param=$1
    stack=$stack_param npm run synth

    if [[ -s ../handlers/$stack_param/cfn.yaml ]]
    then
        printf "SUCCESS: synthesized of $stack_param stack to $stack_param/cfn.yaml file was successful"
    else
        printf "ERROR: synthesized of $stack_param stack to $stack_param/cfn.yaml file failed"
        printf 1
    fi
}

main() {
    pushd cdk

    npm install

    npm run build

    build_cfn_template "sf-move-subscriptions-api"

    popd cdk
}

main

