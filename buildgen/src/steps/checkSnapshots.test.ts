import { generate, GeneratedFile } from './generate';
import { generatorConfig } from '../data/build';
import * as fs from 'fs';
import * as path from 'path';

function readContent(repoRoot: string, relativePath: string) {
	const fullDiskPath = path.join(repoRoot, relativePath);

	const diskContent = fs.existsSync(fullDiskPath)
		? fs.readFileSync(fullDiskPath, 'utf8')
		: undefined;
	return diskContent;
}

// used for filtering by pnpm snapshot checker
const filterToken = 'checkActual %s';

function testFilesMatch<T>(
	files: GeneratedFile[],
	handlerName: string,
	repoRoot: string,
) {
	const filesMap = Object.fromEntries(
		files.map((file) => [file.relativePath, file.content]),
	);

	test.each(Object.keys(filesMap).map((file) => [handlerName, file].join(' ')))(
		filterToken,
		(key) => {
			const [, relativePath] = key.split(' ');

			const generatedContent = filesMap[relativePath];

			const diskContent = readContent(repoRoot, relativePath);

			expect(diskContent).toBe(generatedContent);
		},
	);
}

describe('generateSteps actual files contain the correct content according to buildgen', () => {
	const handlers = generatorConfig.packages.map((pkg) => pkg.name);

	const repoRoot = path.resolve(__dirname, '../../..');
	console.log('repoRoot', repoRoot);

	const allFiles = generate();

	const rootLevelFiles = allFiles.filter(
		(generatedFile) => !generatedFile.relativePath.startsWith('handlers/'),
	);
	testFilesMatch(rootLevelFiles, 'repoRoot', repoRoot);

	handlers.map((handlerName) => {
		const files = allFiles.filter((generatedFile) =>
			generatedFile.relativePath.startsWith('handlers/' + handlerName),
		);
		testFilesMatch(files, handlerName, repoRoot);
	});
});
