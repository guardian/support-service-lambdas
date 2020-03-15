#!/usr/bin/env bash

set -e

build_cfn_template() {
    app_name_param=$1
    app_name=$app_name_param npm run synth

    if [[ -s ../handlers/$app_name_param/cfn.yaml ]]
    then
        printf "SUCCESS: synthesized of $app_name_param stack to $app_name_param/cfn.yaml file was successful"
    else
        printf "ERROR: synthesized of $app_name_param stack to $app_name_param/cfn.yaml file failed"
        printf 1
    fi
}

main() {
    pushd cdk

    npm install
    npm run build
    npm run test

    build_cfn_template "sf-move-subscriptions-api"

    popd cdk
}

main

