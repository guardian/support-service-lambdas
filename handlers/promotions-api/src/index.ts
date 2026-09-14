import type { Handler } from 'aws-lambda';
import { z } from 'zod';
import { Lazy } from '@modules/lazy';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import { productKeySchema } from '@modules/product-catalog/productCatalogSchema';
import { batchGetItemMaxKeys } from '@modules/promotions/v2/getPromotions';
import { badRequest } from '@modules/routing/apiGatewayResponses';
import { Router } from '@modules/routing/router';
import { stageFromEnvironment } from '@modules/stage';
import { listPromotionsEndpoint } from './listPromotionsEndpoint';

const stage = stageFromEnvironment();
const lazyProductCatalogHelper = new Lazy(
	async () => new ProductCatalogHelper(await getProductCatalogFromApi(stage)),
	'Get product catalog helper',
);

const listPromotionsQueryParamsSchema = z
	.object({
		active: z
			.enum(['true', 'false'])
			.optional()
			.transform((value) =>
				value === undefined ? undefined : value === 'true',
			),
		productKey: productKeySchema.optional(),
		productRatePlanKey: z.string().optional(),
		// De-duplicate here so that downstream code (e.g.
		// getPromotionsByCodes, which passes these straight to DynamoDB's
		// BatchGetItem) can rely on receiving unique promo codes.
		promoCodes: z
			.string()
			.optional()
			.transform((value) =>
				value === undefined
					? undefined
					: [
							...new Set(
								value
									.split(',')
									.map((promoCode) => promoCode.trim())
									.filter((promoCode) => promoCode.length > 0),
							),
						],
			)
			.pipe(
				z
					.array(z.string())
					.max(batchGetItemMaxKeys, {
						message: `promoCodes filter cannot contain more than ${batchGetItemMaxKeys} unique promo codes`,
					})
					.optional(),
			),
	})
	.refine(
		(params) =>
			params.productRatePlanKey === undefined ||
			params.productKey !== undefined,
		{
			message:
				'productRatePlanKey filter requires productKey to also be provided',
		},
	);

export const handler: Handler = Router([
	{
		httpMethod: 'GET',
		path: '/promotions',
		handler: async (event) => {
			const queryParamsResult = listPromotionsQueryParamsSchema.safeParse(
				event.queryStringParameters ?? {},
			);
			if (!queryParamsResult.success) {
				return badRequest(
					`Invalid query parameters: ${queryParamsResult.error.message}`,
				);
			}

			return listPromotionsEndpoint(
				stage,
				await lazyProductCatalogHelper.get(),
				queryParamsResult.data,
			);
		},
	},
]);
