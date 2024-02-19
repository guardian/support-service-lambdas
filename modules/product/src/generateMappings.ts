import fs from 'fs';
import { getCatalogFromS3 } from '@modules/catalog/catalog';
import { generateCatalogMapping } from '@modules/product/catalogMappingGeneration';
import { generateTypes } from '@modules/product/typeGeneration';

const writeMappingsToFile = async () => {
	const codeCatalog = await getCatalogFromS3('CODE');
	const codeCatalogMapping = generateCatalogMapping(codeCatalog);
	const prodCatalog = await getCatalogFromS3('PROD');
	const prodCatalogMapping = generateCatalogMapping(prodCatalog);
	const types = generateTypes(prodCatalog);

	const codeCatalogMappingString = JSON.stringify(codeCatalogMapping, null, 2);
	const prodCatalogMappingString = JSON.stringify(prodCatalogMapping, null, 2);
	const typesString = JSON.stringify(types, null, 2);

	fs.writeFileSync('./src/codeCatalogMapping.json', codeCatalogMappingString);
	fs.writeFileSync('./src/prodCatalogMapping.json', prodCatalogMappingString);
	fs.writeFileSync(
		'./src/mappingTypes.ts',
		`export const mappingTypes = ${typesString} as const;`,
	);
};

void (async function () {
	await writeMappingsToFile();
})();
