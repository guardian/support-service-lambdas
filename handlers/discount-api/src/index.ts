import { sendEmail } from '@modules/email/email';
import { getIfDefined } from '@modules/nullAndUndefined';
import { logger } from '@modules/routing/logger';
import { Router } from '@modules/routing/router';
import type { Stage } from '@modules/stage';
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import dayjs from 'dayjs';
import {
	applyDiscountEndpoint,
	previewDiscountEndpoint,
} from './discountEndpoint';
import { docsHandler } from './docsHandler';
import { applyDiscountSchema } from './requestSchema';
import type {
	ApplyDiscountResponseBody,
	EligibilityCheckResponseBody,
} from './responseSchema';
import {
	applyDiscountResponseSchema,
	previewDiscountResponseSchema,
} from './responseSchema';
import { stringify } from './stringify';

const getEnv = (env: string): string =>
	getIfDefined(process.env[env], `${env} environment variable not set`);

const stage = getEnv('STAGE') as Stage;

// main entry point from AWS
export const handler: Handler = Router([
	{
		httpMethod: 'POST',
		path: '/apply-discount',
		handler: applyDiscountHandler,
	},
	{
		httpMethod: 'POST',
		path: '/preview-discount',
		handler: previewDiscountHandler,
	},
	{
		httpMethod: 'GET',
		path: '/docs',
		handler: () => docsHandler(stage),
	},
]);

async function applyDiscountHandler(
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
	const subscriptionNumber = applyDiscountSchema.parse(
		JSON.parse(getIfDefined(event.body, 'No body was provided')),
	).subscriptionNumber;
	logger.mutableAddContext(subscriptionNumber);
	const { response, emailPayload } = await applyDiscountEndpoint(
		stage,
		event.headers,
		subscriptionNumber,
		dayjs(),
	);
	await sendEmail(stage, emailPayload);
	return {
		body: stringify<ApplyDiscountResponseBody>(
			response,
			applyDiscountResponseSchema,
		),
		statusCode: 200,
	};
}

async function previewDiscountHandler(
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
	const subscriptionNumber = applyDiscountSchema.parse(
		JSON.parse(getIfDefined(event.body, 'No body was provided')),
	).subscriptionNumber;
	logger.mutableAddContext(subscriptionNumber);
	logger.log('Previewing discount');
	const result = await previewDiscountEndpoint(
		stage,
		event.headers,
		subscriptionNumber,
		dayjs(),
	);
	return {
		body: stringify<EligibilityCheckResponseBody>(
			result,
			previewDiscountResponseSchema,
		),
		statusCode: 200,
	};
}
