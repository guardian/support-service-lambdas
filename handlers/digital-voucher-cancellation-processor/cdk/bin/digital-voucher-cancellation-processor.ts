#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { DigitalVoucherCancellationProcessorStack } from '../lib/digital-voucher-cancellation-processor-stack';

const app = new cdk.App();
new DigitalVoucherCancellationProcessorStack(app, 'DigitalVoucherCancellationProcessorStack');
