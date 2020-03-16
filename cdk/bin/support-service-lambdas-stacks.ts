#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { SfMoveSubscriptionsStack } from '../lib/sf-move-subscriptions-stack';
import { DigitalVoucherCancellationProcessorStack } from '../lib/digital-voucher-cancellation-processor-stack';

const app = new cdk.App();
new SfMoveSubscriptionsStack(app, 'sf-move-subscriptions-api');
new DigitalVoucherCancellationProcessorStack(app, 'digital-voucher-cancellation-processor');
