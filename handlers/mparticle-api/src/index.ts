import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import type { DataSubjectRequestForm } from '../interfaces/data-subject-request-form';
import { getStatusOfDataSubjectRequest, submitDataSubjectRequest } from './apis/data-subject-request';
import { HttpError } from './http';

export const handler: Handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	try {
		const method = event.httpMethod;
		const path = event.path;
		const pathParameters = event.pathParameters ?? {};

		if (method === 'POST' && path === '/requests') {
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

		if (method === 'GET' && path.match(/^\/requests\/[a-zA-Z0-9-]+$/)) {
			const requestId = pathParameters.requestId ?? path.split('/')[2];

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

		return {
			statusCode: 404,
			body: 'Not Found',
		};
	} catch (err: unknown) {
		if (err instanceof HttpError) {
			return {
				statusCode: 500,
				body: JSON.stringify(err)
			};
		}

		return {
			statusCode: 500,
			body: JSON.stringify({ error: 'Internal Server Error', details: (err as Error).message }),
		};
	}
};
