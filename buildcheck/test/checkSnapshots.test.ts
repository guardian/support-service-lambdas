import * as fs from 'fs';
import * as path from 'path';
import { build } from '../data/build';
import { generate } from '../src/steps/generate';
import type { GeneratedFile } from '../src/steps/generatedFile';

function readContent(repoRoot: string, relativePath: string) {
	const fullDiskPath = path.join(repoRoot, relativePath);

	const diskContent = fs.existsSync(fullDiskPath)
		? fs.readFileSync(fullDiskPath, 'utf8')
		: undefined;
	return diskContent;
}

// used for filtering by pnpm snapshot checker
const filterToken = '%s';

function testFilesMatch(
	isRoot: boolean,
	files: GeneratedFile[],
	repoRoot: string,
) {
	const filesMap = Object.fromEntries(
		files.map((file) => [
			[
				...(isRoot ? ['ROOT'] : []),
				file.targetPath,
				'(template: ' + file.templateFilename + ')',
			].join(' '),
			file.content,
		]),
	);

	test.each(Object.keys(filesMap))(filterToken, (key) => {
		const [relativePath] = key.replace(/^ROOT /, '').split(' ');

		const generatedContent = filesMap[key];

		const diskContent = readContent(repoRoot, relativePath);

		expect(diskContent).toBe(generatedContent);
	});
}

describe('file on disk (+) contains the expected content (-)', () => {
	const handlers = build.handlers.map((pkg) => pkg.name);

	const repoRoot = path.resolve(__dirname, '../..');
	console.log('repoRoot', repoRoot);

	const allFiles = generate();

	const rootLevelFiles = allFiles.filter(
		(generatedFile) => !generatedFile.targetPath.startsWith('handlers/'),
	);
	testFilesMatch(true, rootLevelFiles, repoRoot);

	handlers.map((handlerName) => {
		const files = allFiles.filter((generatedFile) =>
			generatedFile.targetPath.startsWith('handlers/' + handlerName),
		);
		testFilesMatch(false, files, repoRoot);
	});
});
