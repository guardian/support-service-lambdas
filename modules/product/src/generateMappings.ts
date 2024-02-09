import fs from 'fs';
import { getCatalogFromS3 } from '@modules/catalog/catalog';
import { generateCatalogMapping } from '@modules/product/catalogMappingGeneration';

const writeMappingsToFile = async () => {
	const codeCatalog = await getCatalogFromS3('CODE');
	const codeCatalogMapping = generateCatalogMapping(codeCatalog);
	const prodCatalog = await getCatalogFromS3('PROD');
	const prodCatalogMapping = generateCatalogMapping(prodCatalog);

	const codeCatalogMappingString = JSON.stringify(codeCatalogMapping, null, 2);
	const prodCatalogMappingString = JSON.stringify(prodCatalogMapping, null, 2);

	fs.writeFileSync('./src/codeCatalogMapping.json', codeCatalogMappingString);
	fs.writeFileSync('./src/prodCatalogMapping.json', prodCatalogMappingString);
};

void (async function () {
	await writeMappingsToFile();
})();
