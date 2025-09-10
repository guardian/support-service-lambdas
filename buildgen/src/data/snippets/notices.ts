export function relativePath(filename: string) {
	// not watertight logic, but it isn't security critical
	const moduleName = 'buildgen';
	const repoRootIndex = filename.indexOf('/' + moduleName + '/');
	const relativePath =
		repoRootIndex !== -1 ? filename.substring(repoRootIndex + 1) : filename;
	console.log(`relativePath for ${filename}`, relativePath);
	return relativePath;
}

export const notice = (filename: string) =>
	'To edit - 1. update buildgen/src/data/build.ts - 2. run `pnpm buildgen` - template: ' +
	relativePath(filename);
