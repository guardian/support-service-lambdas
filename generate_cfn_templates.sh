##!/usr/bin/env bash
#
#set -e
#
#build_cfn_template() {
#    app_name_param=$1
#    app_name=$app_name_param npm run synth
#
#    if [[ -s ../handlers/$app_name_param/cdk-cfn.yaml ]]
#    then
#        printf "SUCCESS: synthesized of $app_name_param stack to $app_name_param/cdk-cfn.yaml file was successful"
#    else
#        printf "ERROR: synthesized of $app_name_param stack to $app_name_param/cdk-cfn.yaml file failed"
#        exit 1
#    fi
#}
#
#main() {
#    pushd cdk
#
#    npm install
#    npm run build
#    npm run test
#
#    build_cfn_template "sf-move-subscriptions-api"
#    build_cfn_template "digital-voucher-cancellation-processor"
#
#    popd
#}
#
#main
#
