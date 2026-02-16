import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import { zuoraCatalogSchema } from '@modules/zuora-catalog/zuoraCatalogSchema';
import zuoraCatalogFixture from '../../../modules/zuora-catalog/test/fixtures/catalog-prod.json';

export const productCatalog = generateProductCatalog(
	zuoraCatalogSchema.parse(zuoraCatalogFixture),
);
