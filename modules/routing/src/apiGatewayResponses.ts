import { ValidationError } from '@modules/errors';
import { prettyPrint } from '@modules/prettyPrint';
import type { APIGatewayProxyResult } from 'aws-lambda';

export function badRequest(message: string): APIGatewayProxyResult {
	return {
		body: JSON.stringify({ message }),
		statusCode: 400,
	};
}

export function internalServerError(): APIGatewayProxyResult {
	return {
		body: JSON.stringify({ message: 'Internal server error' }),
		statusCode: 500,
	};
}

export function ok(body: unknown): APIGatewayProxyResult {
	return {
		body: JSON.stringify(body),
		statusCode: 200,
	};
}

/**
 * Returns a 201 Created response. Use when a new resource has been successfully created.
 * @param body - The response body to return, typically containing details of the newly created resource.
 * @param location - Optional URL of the newly created resource, set as the Location response header.
 */
export function created(
	body: unknown,
	location?: string,
): APIGatewayProxyResult {
	return {
		headers: location ? { Location: location } : undefined,
		body: JSON.stringify(body),
		statusCode: 201,
	};
}

export function buildErrorResponse(error: unknown): APIGatewayProxyResult {
	if (error instanceof ValidationError) {
		console.log(
			`Handler returned 400 response due to validation error: ${prettyPrint(error)}`,
		);
		return badRequest(error.message);
	}
	console.log(
		`Handler returned 500 response due to unexpected error: ${prettyPrint(error)}`,
	);
	return internalServerError();
}
