import { Logger } from '@modules/logger';
import { getIfDefined } from '@modules/nullAndUndefined';
import { Router } from '@modules/routing/router';
import type { Stage } from '@modules/stage';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
	listenDisputeClosedInputSchema,
	listenDisputeCreatedInputSchema,
} from './requestSchema';

const stage = process.env.STAGE as Stage;
const logger = new Logger();
const router = new Router([
	{
		httpMethod: 'POST',
		path: '/listen-dispute-created',
		handler: listenDisputeCreatedHandler(logger),
	},
	{
		httpMethod: 'POST',
		path: '/listen-dispute-closed',
		handler: listenDisputeClosedHandler(logger),
	},
]);
export const handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	logger.log(`Input is ${JSON.stringify(event)}`);
	const response = await router.routeRequest(event);
	logger.log(`Response is ${JSON.stringify(response)}`);
	return response;
};

function listenDisputeCreatedHandler(logger: Logger) {
	return async (
		event: APIGatewayProxyEvent,
	): Promise<APIGatewayProxyResult> => {
		logger.log('listenDisputeCreatedHandler test ooo');
		const subscriptionNumber = listenDisputeCreatedInputSchema.parse(
			JSON.parse(getIfDefined(event.body, 'No body was provided')),
		).subscriptionNumber;
		await Promise.resolve();
		logger.mutableAddContext(subscriptionNumber);
		return {
			body: JSON.stringify({ ...event, stage }),
			statusCode: 200,
		};
	};
}

function listenDisputeClosedHandler(logger: Logger) {
	return async (
		event: APIGatewayProxyEvent,
	): Promise<APIGatewayProxyResult> => {
		logger.log('listenDisputeClosedHandler');
		const subscriptionNumber = listenDisputeClosedInputSchema.parse(
			JSON.parse(getIfDefined(event.body, 'No body was provided')),
		).subscriptionNumber;
		logger.mutableAddContext(subscriptionNumber);
		await Promise.resolve();
		return {
			body: JSON.stringify({ ...event, stage }),
			statusCode: 200,
		};
	};
}

// this is a type safe version of stringify
//export const stringify = <T>(t: T, type: ZodType<T>): string =>
//	JSON.stringify(type.parse(t));
