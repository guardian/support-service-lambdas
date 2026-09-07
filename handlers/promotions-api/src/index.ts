import type { Handler } from 'aws-lambda';
import { Lazy } from '@modules/lazy';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import { Router } from '@modules/routing/router';
import { stageFromEnvironment } from '@modules/stage';
import { listPromotionsEndpoint } from './listPromotionsEndpoint';

const stage = stageFromEnvironment();
const lazyProductCatalogHelper = new Lazy(
	async () => new ProductCatalogHelper(await getProductCatalogFromApi(stage)),
	'Get product catalog helper',
);

export const handler: Handler = Router([
	{
		httpMethod: 'GET',
		path: '/promotions',
		handler: async () =>
			listPromotionsEndpoint(stage, await lazyProductCatalogHelper.get()),
	},
]);
