import type { APIGatewayProxyResult } from 'aws-lambda';
import type { z } from 'zod';
import { ValidationError } from '@modules/errors';
import { prettyPrint } from '@modules/prettyPrint';
import { stringify } from '@modules/stringify';

function jsonResponse(message: string, statusCode: number) {
	return {
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ message }),
		statusCode,
	};
}
export function badRequest(message: string): APIGatewayProxyResult {
	return jsonResponse(message, 400);
}

export function internalServerError(): APIGatewayProxyResult {
	return jsonResponse('Internal server error', 500);
}

export function notFound(): APIGatewayProxyResult {
	return jsonResponse('Not Found', 404);
}

/**
 * Return a 200 OK response with the provided body.
 * @param body
 * @param schema - an optional Zod schema, passing this will ensure that we only return fields that are defined in the schema
 */
export function ok<T extends Record<string, unknown>>(
	body: T,
	schema?: z.ZodType<T>,
): APIGatewayProxyResult {
	const stringBody = schema
		? stringify(schema.parse(body), schema)
		: JSON.stringify(body);
	return {
		body: stringBody,
		statusCode: 200,
	};
}

/**
 * Returns a 201 Created response. Use when a new resource has been successfully created.
 * @param body - The response body to return, typically containing details of the newly created resource.
 * @param options - An options object which can contain a URL of the newly created resource,
 * set as the Location response header, and/or a Zod schema to ensure only defined fields are
 * returned in the response body.
 */
export function created<T extends Record<string, unknown>>(
	body: T,
	options?: { location?: string; schema?: z.ZodType<T> },
): APIGatewayProxyResult {
	const stringBody = options?.schema
		? stringify(options.schema.parse(body), options.schema)
		: JSON.stringify(body);
	return {
		headers: options?.location ? { Location: options.location } : undefined,
		body: stringBody,
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
