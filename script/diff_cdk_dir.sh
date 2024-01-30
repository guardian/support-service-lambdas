#!/usr/bin/env bash

CDK_DIR=$1
BASE=$2
HEAD=$3

git diff --quiet $BASE..$HEAD $CDK_DIR
if [ $? -eq 0 ]; then
  echo "CDK_CHANGES=false" >> $GITHUB_ENV
else
  echo "CDK_CHANGES=true" >> $GITHUB_ENV
fi