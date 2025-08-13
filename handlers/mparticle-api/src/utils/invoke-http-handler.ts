import type {
	APIGatewayProxyEvent,
	APIGatewayProxyEventHeaders,
	Callback,
	Context,
} from 'aws-lambda';
import { handlerHttp } from '../index';

export const invokeHttpHandler = async ({
	httpMethod,
	path,
	body,
	headers,
}: {
	httpMethod: 'GET' | 'POST';
	path: string;
	body?: string;
	headers?: APIGatewayProxyEventHeaders;
}): Promise<{
	statusCode: number;
	body: string;
}> => {
	const result: unknown = await handlerHttp(
		{
			httpMethod,
			path,
			body,
			headers: headers ?? {},
		} as APIGatewayProxyEvent,
		{} as Context,
		(() => {}) as Callback<unknown>,
	);
	return result as {
		statusCode: number;
		body: string;
	};
};
