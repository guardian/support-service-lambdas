import fs from 'fs';
import { getCatalogFromS3 } from '@modules/catalog/catalog';
import { generateProductCatalogData } from '@modules/product/generateProductCatalogData';
import { generateTypeObject } from '@modules/product/types/generateTypeObject';

const writeMappingsToFile = async () => {
	const codeCatalog = await getCatalogFromS3('CODE');
	const codeCatalogMapping = generateProductCatalogData(codeCatalog);
	const prodCatalog = await getCatalogFromS3('PROD');
	const prodCatalogMapping = generateProductCatalogData(prodCatalog);
	const types = generateTypeObject(prodCatalog);

	const codeCatalogMappingString = JSON.stringify(codeCatalogMapping, null, 2);
	const prodCatalogMappingString = JSON.stringify(prodCatalogMapping, null, 2);
	const typesString = JSON.stringify(types, null, 2);

	fs.writeFileSync('./src/codeCatalogMapping.json', codeCatalogMappingString);
	fs.writeFileSync('./src/prodCatalogMapping.json', prodCatalogMappingString);
	fs.writeFileSync(
		'./src/typeObject.ts',
		`export const mappingTypes = ${typesString} as const;`,
	);
};

void (async function () {
	await writeMappingsToFile();
})();
