import { Router } from '@modules/routing/router';
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import { z } from 'zod';
import type { DataSubjectRequestForm } from '../interfaces/data-subject-request-form';
import { getStatusOfDataSubjectRequest, submitDataSubjectRequest } from './apis/data-subject-request';
import { HttpError } from './http';

const routerHandler = (fn: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>) =>
	async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
		try {
			return await fn(event);
		} catch (err) {
			if (err instanceof HttpError) {
				console.warn(`Http Error: ${err.statusCode} ${err.statusText}`, err.body);
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
		path: '/requests',
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
		})
	},
	{
		httpMethod: 'GET',
		path: '/requests/{requestId}',
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
	}
]);

export const handler: Handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	return router.routeRequest(event);
};
