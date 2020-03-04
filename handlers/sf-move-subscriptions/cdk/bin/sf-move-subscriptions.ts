#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { SfMoveSubscriptionsStack } from '../lib/sf-move-subscriptions-stack';

const app = new cdk.App();
new SfMoveSubscriptionsStack(app, 'CdkStack');
