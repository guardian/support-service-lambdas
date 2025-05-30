import { Router } from '@modules/routing/router';
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import type { DataSubjectRequestForm } from '../interfaces/data-subject-request-form';
import type { DataSubjectRequestState } from '../interfaces/data-subject-request-state';
import type { DataSubjectRequestSubmission } from '../interfaces/data-subject-request-submission';
import { getStatusOfDataSubjectRequest, submitDataSubjectRequest } from './apis/data-subject-request';
import { HttpError } from './http';

const routerHandler = async (event: APIGatewayProxyEvent, feature: () => Promise<APIGatewayProxyResult>): Promise<APIGatewayProxyResult> => {
	try {
		return await feature();
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
}

const router = new Router([
	{
		httpMethod: 'POST',
		path: '/requests',
		handler: (
			event: APIGatewayProxyEvent,
		): Promise<APIGatewayProxyResult> => {
			return routerHandler(event, async () => {
				let payload: unknown;

				try {
					payload = JSON.parse(event.body ?? '{}');
				} catch {
					return {
						statusCode: 400,
						body: 'Invalid JSON in request body',
					};
				}

				const result: DataSubjectRequestSubmission = await submitDataSubjectRequest(payload as DataSubjectRequestForm);
				return {
					statusCode: 200,
					body: JSON.stringify(result),
				};
			})
		}
	},
	{
		httpMethod: 'GET',
		path: '/requests/{requestId}',
		handler: async (
			event: APIGatewayProxyEvent,
		): Promise<APIGatewayProxyResult> => {
			return routerHandler(event, async () => {
				const requestId = event.pathParameters?.requestId;

				if (!requestId) {
					return {
						statusCode: 400,
						body: 'Missing "requestId" in path'
					};
				}

				const result: DataSubjectRequestState = await getStatusOfDataSubjectRequest(requestId);
				return {
					statusCode: 200,
					body: JSON.stringify(result)
				};
			})
		}
	},
]);

export const handler: Handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	return router.routeRequest(event);
};
