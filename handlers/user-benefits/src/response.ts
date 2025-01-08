import type { UserBenefitsResponse } from '@modules/product-benefits/schemas';
import type { APIGatewayProxyResult } from 'aws-lambda';

export const buildNonCachedHttpResponse = (
	benefits: UserBenefitsResponse,
): APIGatewayProxyResult => ({
	body: JSON.stringify(benefits),
	// https://www.fastly.com/documentation/guides/concepts/edge-state/cache/cache-freshness/#preventing-content-from-being-cached
	headers: {
		'Cache-Control': 'private, no-store',
	},
	statusCode: 200,
});
