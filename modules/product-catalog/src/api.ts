import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import { productCatalogSchema } from '@modules/product-catalog/productCatalogSchema';

export const getProductCatalogFromApi = async (
	stage: string,
): Promise<ProductCatalog> => {
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
		console.log(`Response from catalog api was: ${JSON.stringify(json)}`);
		return productCatalogSchema.parse(json);
	} else {
		throw new Error(
			'Response body was undefined when fetching the Product Catalog from S3',
		);
	}
};
