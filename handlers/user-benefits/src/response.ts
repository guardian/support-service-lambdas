import { ValidationError } from '@modules/errors';
import { prettyPrint } from '@modules/prettyPrint';
import type { UserBenefitsResponse } from '@modules/product-benefits/schemas';
import type { Stage } from '@modules/stage';
import type { APIGatewayProxyResult } from 'aws-lambda';
import { allowedOriginsForStage } from './cors';

const buildCorsHeaders = (
	origin: string | undefined,
	stage: Stage,
): Record<string, string | number | boolean> =>
	origin && allowedOriginsForStage(stage).includes(origin)
		? {
				'access-control-allow-origin': origin,
				vary: 'Origin',
				'access-control-allow-headers': '*',
				'access-control-allow-methods': 'GET',
			}
		: {};

export const buildHttpResponse = (
	stage: Stage,
	origin: string | undefined,
	benefits: UserBenefitsResponse,
): APIGatewayProxyResult => {
	return {
		body: JSON.stringify(benefits),
		// https://www.fastly.com/documentation/guides/concepts/edge-state/cache/cache-freshness/#preventing-content-from-being-cached
		headers: {
			'Cache-Control': 'private, no-store',
			...buildCorsHeaders(origin, stage),
		},
		statusCode: 200,
	};
};

export const buildErrorResponse = (error: unknown): APIGatewayProxyResult => {
	if (error instanceof ValidationError) {
		console.log(
			`Handler returned 400 response due to validation error: ${prettyPrint(error)}`,
		);
		return {
			body: error.message,
			statusCode: 400,
		};
	}
	console.log(
		`Handler returned 500 response due to unexpected error: ${prettyPrint(error)}`,
	);
	return {
		body: 'Internal server error',
		statusCode: 500,
	};
};
