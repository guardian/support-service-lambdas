import { ValidationError } from '@modules/utils/errors';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export type HttpMethod =
	| 'GET'
	| 'POST'
	| 'PUT'
	| 'DELETE'
	| 'PATCH'
	| 'OPTIONS'
	| 'HEAD';

type Route = {
	httpMethod: HttpMethod;
	path: string;
	handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
};

export const NotFoundResponse = {
	body: 'Not Found',
	statusCode: 404,
};

export class Router {
	constructor(private routes: Route[]) {}
	async routeRequest(
		event: APIGatewayProxyEvent,
	): Promise<APIGatewayProxyResult> {
		try {
			const route = this.routes.find(
				(route) =>
					route.path === event.path &&
					route.httpMethod === event.httpMethod.toUpperCase(),
			);
			if (route) {
				return await route.handler(event);
			}
			return NotFoundResponse;
		} catch (error) {
			console.log('Caught exception with message: ', error);
			if (error instanceof ValidationError) {
				console.log(`Validation failure: ${error.message}`);
				return {
					body: error.message,
					statusCode: 400,
				};
			}
			return {
				body: 'Internal server error',
				statusCode: 500,
			};
		}
	}
}
