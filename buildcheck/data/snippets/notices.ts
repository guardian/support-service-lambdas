export function relativePath(filename: string) {
	// not watertight logic, but it isn't security critical
	const moduleName = 'buildcheck';
	const repoRootIndex = filename.indexOf('/' + moduleName + '/');
	return repoRootIndex !== -1
		? filename.substring(repoRootIndex + 1)
		: filename;
}

export const notice = (filename: string) =>
	'MANAGED FILE: to push changes see buildcheck/README.md - template: ' +
	relativePath(filename);
