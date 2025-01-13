import fs from 'fs';
import { getZuoraCatalogFromS3 } from '@modules/zuora-catalog/S3';
import { generateTypeObjects } from '@modules/product-catalog/generateTypeObject';

const writeTypesToFile = async () => {
	const prodCatalog = await getZuoraCatalogFromS3('PROD');
	const types = generateTypeObjects(prodCatalog);
	const activeTypesString = JSON.stringify(types.active, null, 2);
	const inactiveTypesString = JSON.stringify(types.inactive, null, 2);

	fs.writeFileSync(
		'./src/typeObject.ts',
		`export const activeTypeObject = ${activeTypesString} as const;\nexport const inactiveTypesObject = ${inactiveTypesString} as const;`,
	);
};

void (async function () {
	await writeTypesToFile();
})();
