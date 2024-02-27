import type { ProductCatalog } from '@modules/product/productCatalog';
import { productCatalogSchema } from '@modules/product/productCatalogSchema';

export const getProductCatalogFromApi = async (stage: string) => {
	console.log('getProductCatalogFromApi');
	const url =
		stage === 'PROD'
			? 'https://product-catalog.guardianapis.com/product-catalog.json'
			: 'https://product-catalog.code.dev-guardianapis.com/product-catalog.json';
	const response = await fetch(url, {
		method: 'GET',
	});

	const json = await response.json();
	if (response.ok) {
		return productCatalogSchema.parse(json) as ProductCatalog;
	} else {
		throw new Error(
			'Response body was undefined when fetching the Product Catalog from S3',
		);
	}
};
