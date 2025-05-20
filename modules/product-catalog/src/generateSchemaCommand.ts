import fs from 'fs';
import { getZuoraCatalogFromS3 } from '@modules/zuora-catalog/S3';
import { generateProductBillingPeriods } from '@modules/product-catalog/generateProductBillingPeriods';
import { generateSchema } from '@modules/product-catalog/generateSchema';

const writeSchemaToFile = async () => {
	const prodCatalog = await getZuoraCatalogFromS3('PROD');
	const generatedSchema = generateSchema(prodCatalog);
	fs.writeFileSync('./src/productCatalogSchema.ts', generatedSchema);
	const productBillingPeriods = generateProductBillingPeriods(prodCatalog);
	fs.writeFileSync('./src/productBillingPeriods.ts', productBillingPeriods);
};

void (async function () {
	await writeSchemaToFile();
})();
