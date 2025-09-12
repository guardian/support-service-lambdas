import { Logger } from '@modules/routing/logger';
import { createRoute, Router } from '@modules/routing/router';
import type { Stage } from '@modules/stage';
import type { Handler } from 'aws-lambda';
import dayjs from 'dayjs';
import { z } from 'zod';
import { contributionToSupporterPlusEndpoint } from './productSwitchEndpoint';
import type { ProductSwitchRequestBody } from './schemas';
import { productSwitchRequestSchema } from './schemas';

const stage = process.env.STAGE as Stage;
const logger = new Logger();

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
export const handler: Handler = new Router(
	[
		createRoute<PathParser, ProductSwitchRequestBody>({
			httpMethod: 'POST',
			path: '/product-move/recurring-contribution-to-supporter-plus/{subscriptionNumber}',
			handler: contributionToSupporterPlusEndpoint(logger, stage, dayjs()),
			parser: {
				path: pathParserSchema,
				body: productSwitchRequestSchema,
			},
		}),
	],
	logger,
).routeRequest;
