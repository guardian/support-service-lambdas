import fs from 'fs';
import { getZuoraCatalogFromS3 } from '@modules/zuora-catalog/S3';
import { generateProductBillingPeriods } from '@modules/product-catalog/generateProductBillingPeriods';
import { generateSchema } from '@modules/product-catalog/generateSchema';
import { generateValidProductAndRatePlanCombinationsSchema } from '@modules/product-catalog/generateValidProductAndRatePlanCombinations';

const writeSchemaToFile = async () => {
	const prodCatalog = await getZuoraCatalogFromS3('PROD');
	const generatedSchema = generateSchema(prodCatalog);
	fs.writeFileSync('./src/productCatalogSchema.ts', generatedSchema);
	const productBillingPeriods = generateProductBillingPeriods(prodCatalog);
	fs.writeFileSync('./src/productBillingPeriods.ts', productBillingPeriods);
	const productToRatePlanMapping =
		generateValidProductAndRatePlanCombinationsSchema(prodCatalog);
	fs.writeFileSync(
		'./src/validProductAndRatePlanCombinations.ts',
		productToRatePlanMapping,
	);
};

void (async function () {
	await writeSchemaToFile();
})();
