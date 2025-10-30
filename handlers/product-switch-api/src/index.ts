import { createRoute, Router } from '@modules/routing/router';
import type { Stage } from '@modules/stage';
import type { Handler } from 'aws-lambda';
import dayjs from 'dayjs';
import { z } from 'zod';
import { contributionToSupporterPlusEndpoint } from './productSwitchEndpoint';
import { frequencyChangeHandler } from './frequencyChange';
import type { ProductSwitchRequestBody, FrequencyChangeRequestBody } from './schemas';
import { productSwitchRequestSchema, frequencyChangeRequestSchema } from './schemas';

const stage = process.env.STAGE as Stage;

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
	createRoute<PathParser, ProductSwitchRequestBody>({
		httpMethod: 'POST',
		path: '/product-move/recurring-contribution-to-supporter-plus/{subscriptionNumber}',
		handler: contributionToSupporterPlusEndpoint(stage, dayjs()),
		parser: {
			path: pathParserSchema,
			body: productSwitchRequestSchema,
		},
	}),
	createRoute<PathParser, FrequencyChangeRequestBody>({
		httpMethod: 'POST',
		path: '/product-switch/frequency/{subscriptionNumber}',
		handler: frequencyChangeHandler(stage, dayjs()),
		parser: {
			path: pathParserSchema,
			body: frequencyChangeRequestSchema,
		},
	}),
]);
