import fs from 'fs';
import { generateProductBillingPeriods } from '@modules/product-catalog/generateProductBillingPeriods';
import { generateProductPurchaseSchema } from '@modules/product-catalog/generateProductPurchaseSchema';
import { generateSchema } from '@modules/product-catalog/generateSchema';
import { getZuoraCatalogFromS3 } from '@modules/zuora-catalog/S3';

const writeSchemaToFile = async () => {
	const prodCatalog = await getZuoraCatalogFromS3('PROD');
	const generatedSchema = generateSchema(prodCatalog);
	fs.writeFileSync('./src/productCatalogSchema.ts', generatedSchema);
	const productBillingPeriods = generateProductBillingPeriods(prodCatalog);
	fs.writeFileSync('./src/productBillingPeriods.ts', productBillingPeriods);
	const productPurchaseSchema = generateProductPurchaseSchema(prodCatalog);
	fs.writeFileSync('./src/productPurchaseSchema.ts', productPurchaseSchema);
};

void (async function () {
	await writeSchemaToFile();
})();
