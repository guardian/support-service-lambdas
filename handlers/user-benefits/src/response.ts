import type { UserBenefitsResponse } from '@modules/product-benefits/schemas';
import type { Stage } from '@modules/stage';
import type { APIGatewayProxyResult } from 'aws-lambda';
import { allowedOriginsForStage } from './cors';

const buildCorsHeaders = (
	origin: string | undefined,
	stage: Stage,
): Record<string, string | number | boolean> => {
	if (origin) {
		console.log(`Origin header is ${origin}`);
		const allowedOrigins = allowedOriginsForStage(stage);
		console.log(
			`Allowed origins for stage ${stage}: ${allowedOrigins.join(', ')}`,
		);
		return allowedOrigins.includes(origin)
			? {
					'access-control-allow-origin': origin,
					vary: 'Origin',
					'access-control-allow-headers': '*',
					'access-control-allow-methods': 'GET',
				}
			: {};
	}
	console.log('Origin header missing from request');
	return {};
};

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
