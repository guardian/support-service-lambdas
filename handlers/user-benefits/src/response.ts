import type { UserBenefitsResponse } from '@modules/product-benefits/schemas';
import type { Stage } from '@modules/stage';
import type { APIGatewayProxyResult } from 'aws-lambda';

export const buildNonCachedHttpResponse = (
	stage: Stage,
	benefits: UserBenefitsResponse,
): APIGatewayProxyResult => ({
	body: JSON.stringify(benefits),
	// https://www.fastly.com/documentation/guides/concepts/edge-state/cache/cache-freshness/#preventing-content-from-being-cached
	headers: {
		'Cache-Control': 'private, no-store',
		// CORS headers
		'access-control-allow-headers': '*',
		'access-control-allow-methods': 'GET',
		'access-control-allow-origin': '*',
	},
	statusCode: 200,
});
