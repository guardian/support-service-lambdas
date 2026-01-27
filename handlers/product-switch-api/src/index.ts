import { Router } from '@modules/routing/router';
import { withMMAIdentityCheck } from '@modules/routing/withMMAIdentityCheck';
import { withParsers } from '@modules/routing/withParsers';
import { stageFromEnvironment } from '@modules/stage';
import type { Handler } from 'aws-lambda';
import dayjs from 'dayjs';
import { z } from 'zod';
import {
	ChangePlanEndpoint,
	deprecatedContributionToSupporterPlusEndpoint,
} from './changePlan/changePlanEndpoint';
import {
	productSwitchGenericRequestSchema,
	productSwitchRequestSchema,
} from './changePlan/schemas';
import { frequencySwitchHandler } from './frequencySwitchEndpoint';
import { frequencySwitchRequestSchema } from './frequencySwitchSchemas';

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
				deprecatedContributionToSupporterPlusEndpoint(stage, dayjs()),
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
				ChangePlanEndpoint.handler(stage, dayjs()),
				(parsed) => parsed.path.subscriptionNumber,
			),
		),
	},
	{
		httpMethod: 'POST',
		path: '/subscriptions/{subscriptionNumber}/change-plan/preview',
		handler: withParsers(
			pathParserSchema,
			productSwitchGenericRequestSchema,
			withMMAIdentityCheck(
				stage,
				ChangePlanEndpoint.previewHandler(stage, dayjs()),
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
