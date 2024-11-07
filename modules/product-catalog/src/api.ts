import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import { productCatalogSchema } from '@modules/product-catalog/productCatalogSchema';

export const getProductCatalogFromApi = async (
	stage: string,
	log: (messsage: string) => void = console.log,
): Promise<ProductCatalog> => {
	log('getProductCatalogFromApi');
	const url =
		stage === 'PROD'
			? 'https://product-catalog.guardianapis.com/product-catalog.json'
			: 'https://product-catalog.code.dev-guardianapis.com/product-catalog.json';
	const response = await fetch(url, {
		method: 'GET',
	});

	const json = await response.json();
	if (response.ok) {
		log(`Response from catalog api was: ${JSON.stringify(json)}`);
		return productCatalogSchema.parse(json);
	} else {
		throw new Error(
			'Response body was undefined when fetching the Product Catalog from S3',
		);
	}
};
