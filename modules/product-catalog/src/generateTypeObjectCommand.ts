import fs from 'fs';
import { getZuoraCatalogFromS3 } from '@modules/zuora-catalog/S3';
import { generateTypeObject } from '@modules/product-catalog/generateTypeObject';

const writeTypesToFile = async () => {
	const prodCatalog = await getZuoraCatalogFromS3('PROD');
	const types = generateTypeObject(prodCatalog);
	const typesString = JSON.stringify(types, null, 2);

	fs.writeFileSync(
		'./src/typeObject.ts',
		`export const typeObject = ${typesString} as const;`,
	);
};

void (async function () {
	await writeTypesToFile();
})();
