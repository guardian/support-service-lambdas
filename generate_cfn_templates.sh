#!/usr/bin/env bash

set -e

build_cfn_template() {
    project_name_param=$1
    project_name=$project_name_param npm run synth

    if [[ -s ../handlers/$project_name_param/cfn.yaml ]]
    then
        printf "SUCCESS: synthesized of $project_name_param stack to $project_name_param/cfn.yaml file was successful"
    else
        printf "ERROR: synthesized of $project_name_param stack to $project_name_param/cfn.yaml file failed"
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

