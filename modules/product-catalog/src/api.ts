import { logger } from '@modules/routing/logger';
import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import { productCatalogSchema } from '@modules/product-catalog/productCatalogSchema';

export const getProductCatalogFromApi = async (
	stage: string,
): Promise<ProductCatalog> => {
	logger.log('getProductCatalogFromApi');
	const url =
		stage === 'PROD'
			? 'https://product-catalog.guardianapis.com/product-catalog.json'
			: 'https://product-catalog.code.dev-guardianapis.com/product-catalog.json';
	const response = await fetch(url, {
		method: 'GET',
	});

	const json = await response.json();
	if (response.ok) {
		logger.log('Successfully fetched Product Catalog');
		return productCatalogSchema.parse(json);
	} else {
		throw new Error(
			'Response body was undefined when fetching the Product Catalog from S3',
		);
	}
};
