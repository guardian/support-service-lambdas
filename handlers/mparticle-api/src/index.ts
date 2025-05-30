import { Router } from '@modules/routing/router';
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import type { DataSubjectRequestForm } from '../interfaces/data-subject-request-form';
import { getStatusOfDataSubjectRequest, submitDataSubjectRequest } from './apis/data-subject-request';
// import { HttpError } from './http';

const router = new Router([
	{
		httpMethod: 'POST',
		path: '/requests',
		handler: async (
			event: APIGatewayProxyEvent,
		): Promise<APIGatewayProxyResult> => {
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
				statusCode: 200,
				body: JSON.stringify(await submitDataSubjectRequest(payload as DataSubjectRequestForm)),
			};
		}
	},
	{
		httpMethod: 'GET',
		path: '/requests/{requestId}',
		handler: async (
			event: APIGatewayProxyEvent,
		): Promise<APIGatewayProxyResult> => {
			const requestId = event.pathParameters?.requestId;

			if (!requestId) {
				return {
					statusCode: 400,
					body: 'Missing "requestId" in path'
				};
			}

			return {
				statusCode: 200,
				body: JSON.stringify(await getStatusOfDataSubjectRequest(requestId))
			};
		}
	},
]);

export const handler: Handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	return router.routeRequest(event);
	// try {
	// 	console.log(JSON.stringify(router))
	// 	const method = event.httpMethod;
	// 	const path = event.path;
	// 	const pathParameters = event.pathParameters ?? {};

	// 	if (method === 'POST' && path === '/requests') {

	// 	}

	// 	if (method === 'GET' && path.match(/^\/requests\/[a-zA-Z0-9-]+$/)) {

	// 	}

	// 	return {
	// 		statusCode: 404,
	// 		body: 'Not Found',
	// 	};
	// } catch (err: unknown) {
	// 	if (err instanceof HttpError) {
	// 		return {
	// 			statusCode: 500,
	// 			body: JSON.stringify(err)
	// 		};
	// 	}

	// 	return {
	// 		statusCode: 500,
	// 		body: JSON.stringify({ error: 'Internal Server Error', details: (err as Error).message }),
	// 	};
	// }
};
