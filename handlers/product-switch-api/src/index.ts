import { Router } from '@modules/routing/router';
import { withMMAIdentityCheck } from '@modules/routing/withMMAIdentityCheck';
import { withParsers } from '@modules/routing/withParsers';
import { stageFromEnvironment } from '@modules/stage';
import type { Handler } from 'aws-lambda';
import dayjs from 'dayjs';
import { z } from 'zod';
import { contributionToSupporterPlusEndpoint } from './productSwitchEndpoint';
import { productSwitchRequestSchema } from './schemas';

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
]);
