import { sendEmail } from '@modules/email/email';
import { getIfDefined } from '@modules/nullAndUndefined';
import { Router } from '@modules/routing/router';
import type { Stage } from '@modules/stage';
import { Logger } from '@modules/zuora/logger';
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import dayjs from 'dayjs';
import type { ZodType } from 'zod';
import {
	applyDiscountEndpoint,
	previewDiscountEndpoint,
} from './discountEndpoint';
import { applyDiscountSchema } from './requestSchema';
import type {
	ApplyDiscountResponseBody,
	EligibilityCheckResponseBody,
} from './responseSchema';
import {
	applyDiscountResponseSchema,
	previewDiscountResponseSchema,
} from './responseSchema';

const stage = process.env.STAGE as Stage;
const logger = new Logger();
const router = new Router([
	{
		httpMethod: 'POST',
		path: '/apply-discount',
		handler: applyDiscountHandler(logger),
	},
	{
		httpMethod: 'POST',
		path: '/preview-discount',
		handler: previewDiscountHandler(logger),
	},
]);
export const handler: Handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	logger.log(`Input is ${JSON.stringify(event)}`);
	const response = await router.routeRequest(event);
	logger.log(`Response is ${JSON.stringify(response)}`);
	return response;
};

function applyDiscountHandler(logger: Logger) {
	return async (
		event: APIGatewayProxyEvent,
	): Promise<APIGatewayProxyResult> => {
		const subscriptionNumber = applyDiscountSchema.parse(
			JSON.parse(getIfDefined(event.body, 'No body was provided')),
		).subscriptionNumber;
		logger.mutableAddContext(subscriptionNumber);
		const { response, emailPayload } = await applyDiscountEndpoint(
			logger,
			stage,
			event.headers,
			subscriptionNumber,
			dayjs(),
		);
		await sendEmail(stage, emailPayload, logger.log.bind(logger));
		return {
			body: stringify<ApplyDiscountResponseBody>(
				response,
				applyDiscountResponseSchema,
			),
			statusCode: 200,
		};
	};
}

function previewDiscountHandler(logger: Logger) {
	return async (
		event: APIGatewayProxyEvent,
	): Promise<APIGatewayProxyResult> => {
		logger.log('Previewing discount');
		const subscriptionNumber = applyDiscountSchema.parse(
			JSON.parse(getIfDefined(event.body, 'No body was provided')),
		).subscriptionNumber;
		logger.mutableAddContext(subscriptionNumber);
		const result = await previewDiscountEndpoint(
			logger,
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
	};
}

// this is a type safe version of stringify
export const stringify = <T>(t: T, type: ZodType<T>): string =>
	JSON.stringify(type.parse(t));
