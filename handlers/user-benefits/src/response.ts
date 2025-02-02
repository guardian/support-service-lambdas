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
