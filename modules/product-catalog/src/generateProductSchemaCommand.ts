import fs from 'fs';
import { getZuoraCatalogFromS3 } from '@modules/zuora-catalog/S3';
import { generateSchema } from '@modules/product-catalog/generateProductCatalogSchema';

const writeSchemaToFile = async () => {
	const prodCatalog = await getZuoraCatalogFromS3('PROD');
	// const types = generateTypeObjects(prodCatalog);
	// const activeTypesString = JSON.stringify(types.active, null, 2);
	// const inactiveTypesString = JSON.stringify(types.inactive, null, 2);
	const generatedSchema = generateSchema(prodCatalog);
	fs.writeFileSync('./src/productCatalogSchema.ts', generatedSchema);
};

void (async function () {
	await writeSchemaToFile();
})();
