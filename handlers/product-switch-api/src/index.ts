import { Router } from '@modules/routing/router';
import { withMMAIdentityCheck } from '@modules/routing/withMMAIdentityCheck';
import { withParsers } from '@modules/routing/withParsers';
import { stageFromEnvironment } from '@modules/stage';
import type { Handler } from 'aws-lambda';
import dayjs from 'dayjs';
import { z } from 'zod';
import { frequencySwitchHandler } from './frequencySwitchEndpoint';
import { frequencySwitchRequestSchema } from './frequencySwitchSchemas';
import {
	contributionToSupporterPlusEndpoint,
	productSwitchEndpoint,
} from './changePlan/productSwitchEndpoint';
import {
	productSwitchGenericRequestSchema,
	productSwitchRequestSchema,
} from './schemas';

const stage = stageFromEnvironment();

const pathParserSchema = z.object({
	subscriptionNumber: z
		.string()
		.regex(
			/^A-S\d+$/,
			'Subscription number must start with A-S and be followed by digits',
		),
});

export type PathParser = z.infer<typeof pathParserSchema>;

// entry point from AWS lambda
export const handler: Handler = Router([
	{
		// deprecated, use the generic one below
		httpMethod: 'POST',
		path: '/product-move/recurring-contribution-to-supporter-plus/{subscriptionNumber}',
		handler: withParsers(
			pathParserSchema,
			productSwitchRequestSchema,
			withMMAIdentityCheck(
				stage,
				contributionToSupporterPlusEndpoint(stage, dayjs()),
				(parsed) => parsed.path.subscriptionNumber,
			),
		),
	},
	{
		httpMethod: 'POST',
		path: '/subscriptions/{subscriptionNumber}/change-plan',
		handler: withParsers(
			pathParserSchema,
			productSwitchGenericRequestSchema,
			withMMAIdentityCheck(
				stage,
				productSwitchEndpoint(stage, dayjs()),
				(parsed) => parsed.path.subscriptionNumber,
			),
		),
	},
	{
		httpMethod: 'POST',
		path: '/product-switch/billing-frequency/{subscriptionNumber}',
		handler: withParsers(
			pathParserSchema,
			frequencySwitchRequestSchema,
			withMMAIdentityCheck(
				stage,
				frequencySwitchHandler(stage, dayjs()),
				(parsed) => parsed.path.subscriptionNumber,
			),
		),
	},
]);
