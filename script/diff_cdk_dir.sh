#!/usr/bin/env bash

git diff --quiet main $1
if [ $? -eq 0 ]; then
  echo "CDK_CHANGES=false" >> $GITHUB_ENV
else
  echo "CDK_CHANGES=true" >> $GITHUB_ENV
fi
