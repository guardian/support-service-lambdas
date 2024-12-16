import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const HttpMethods = [
	'GET',
	'POST',
	'PUT',
	'DELETE',
	'PATCH',
	'OPTIONS',
	'HEAD',
];
export type HttpMethod = (typeof HttpMethods)[number];

type Route = {
	httpMethod: HttpMethod;
	path: string;
	handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
};

export class Router {
	constructor(private routes: Route[]) {}
	async routeRequest(
		event: APIGatewayProxyEvent,
	): Promise<APIGatewayProxyResult> {
		const route = this.routes.find(
			(route) =>
				route.path === event.path &&
				route.httpMethod === event.httpMethod.toUpperCase(),
		);
		if (route) {
			return await route.handler(event);
		}
		return {
			body: 'Not Found',
			statusCode: 404,
		};
	}
}
