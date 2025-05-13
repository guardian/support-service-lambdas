import fs from 'fs';
import { getZuoraCatalogFromS3 } from '@modules/zuora-catalog/S3';
import { generateSchema } from '@modules/product-catalog/generateProductCatalogSchema';

const writeTypesToFile = async () => {
	const prodCatalog = await getZuoraCatalogFromS3('PROD');
	// const types = generateTypeObjects(prodCatalog);
	// const activeTypesString = JSON.stringify(types.active, null, 2);
	// const inactiveTypesString = JSON.stringify(types.inactive, null, 2);
	const generatedSchema = generateSchema(prodCatalog);
	fs.writeFileSync('./src/productCatalogSchema.ts', generatedSchema);
	// fs.writeFileSync(
	// 	'./src/typeObject.ts',
	// 	`export const activeTypeObject = ${activeTypesString} as const;\nexport const inactiveTypeObject = ${inactiveTypesString} as const;`,
	// );
};

void (async function () {
	await writeTypesToFile();
})();
