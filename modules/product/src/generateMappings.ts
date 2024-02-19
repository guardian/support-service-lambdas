import fs from 'fs';
import { getCatalogFromS3 } from '@modules/catalog/catalog';
import { generateCatalogMapping } from '@modules/product/catalogMappingGeneration';
import { generateTypes } from '@modules/product/typeGeneration';

const writeMappingsToFile = async () => {
	const codeCatalog = await getCatalogFromS3('CODE');
	const codeCatalogMapping = generateCatalogMapping(codeCatalog);
	const codeTypes = generateTypes(codeCatalog);
	const prodCatalog = await getCatalogFromS3('PROD');
	const prodCatalogMapping = generateCatalogMapping(prodCatalog);
	const prodTypes = generateTypes(prodCatalog);

	const codeCatalogMappingString = JSON.stringify(codeCatalogMapping, null, 2);
	const codeTypesString = JSON.stringify(codeTypes, null, 2);
	const prodCatalogMappingString = JSON.stringify(prodCatalogMapping, null, 2);
	const prodTypesString = JSON.stringify(prodTypes, null, 2);

	fs.writeFileSync('./src/codeCatalogMapping.json', codeCatalogMappingString);
	fs.writeFileSync('./src/codeTypes.json', codeTypesString);
	fs.writeFileSync('./src/prodCatalogMapping.json', prodCatalogMappingString);
	fs.writeFileSync('./src/prodTypes.json', prodTypesString);
};

void (async function () {
	await writeMappingsToFile();
})();
