import { Router } from '@modules/routing/router';
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import { z } from 'zod';
import type { DataSubjectRequestForm } from '../interfaces/data-subject-request-form';
import type { EventBatch } from '../interfaces/event-batch';
import { getStatusOfDataSubjectRequest, submitDataSubjectRequest } from './apis/data-subject-requests';
import { uploadAnEventBatch } from './apis/events';
import { HttpError } from './http';

const routerHandler = (fn: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>) =>
	async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
		try {
			return await fn(event);
		} catch (err) {
			if (err instanceof HttpError) {
				console.error(`Http Error: ${err.statusCode} ${err.statusText}`, err.body);
				return {
					statusCode: err.statusCode,
					body: JSON.stringify(err.body)
				};
			}
			throw err;
		}
	};

const router = new Router([
	{
		httpMethod: 'POST',
		path: '/data-subject-requests',
		handler: routerHandler(async (event) => {
			let payload: unknown;
			try {
				payload = JSON.parse(event.body ?? '{}');
			} catch {
				return {
					statusCode: 400,
					body: 'Invalid JSON in request body',
				};
			}

			return {
				statusCode: 201,
				body: JSON.stringify(await submitDataSubjectRequest(payload as DataSubjectRequestForm)),
			};
		}),
		validation: {
			body: z.object({
				regulation: z.enum(['gdpr', 'ccpa']),
				requestId: z.string().uuid(),
				requestType: z.enum(['access', 'portability', 'erasure']),
				submittedTime: z.date(),
				userId: z.string().email(),
			})
		}
	},
	{
		httpMethod: 'GET',
		path: '/data-subject-requests/{requestId}',
		handler: routerHandler(async (event) => {
			return {
				statusCode: 200,
				body: JSON.stringify(await getStatusOfDataSubjectRequest(event.pathParameters?.requestId ?? ''))
			};
		}),
		validation: {
			path: z.object({
				requestId: z.string().uuid(),
			})
		}
	},
	{
		httpMethod: 'POST',
		path: '/events',
		handler: routerHandler(async (event) => {
			let payload: unknown;
			try {
				payload = JSON.parse(event.body ?? '{}');
			} catch {
				return {
					statusCode: 400,
					body: 'Invalid JSON in request body',
				};
			}

			return {
				statusCode: 201,
				body: JSON.stringify(await uploadAnEventBatch(payload as EventBatch)),
			};
		}),
		validation: {
			body: z.object({
				events: z.array(z.object({
					/** Custom data payload for the event */
					data: z.record(z.string(), z.unknown()),

					/** Type identifier for the event */
					eventType: z.string(),
				})),
				deviceInfo: z.record(z.string(), z.unknown()),
				userAttributes: z.record(z.string(), z.unknown()),
				deletedUserAttributes: z.array(z.string()),
				userIdentities: z.record(z.string(), z.unknown()),
				applicationInfo: z.record(z.string(), z.unknown()),
				schemaVersion: z.number(),
				environment: z.string(),
				context: z.record(z.string(), z.unknown()),
				ip: z.string(),
			})
		}
	},
]);

export const handler: Handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	return router.routeRequest(event);
};
