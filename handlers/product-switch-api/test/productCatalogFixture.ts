import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import zuoraCatalogFixture from '../../../modules/zuora-catalog/test/fixtures/catalog-prod.json';

export const productCatalog = generateProductCatalog(zuoraCatalogFixture);
