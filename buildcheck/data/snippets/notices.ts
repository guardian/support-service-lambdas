import * as yaml from 'js-yaml';

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

type ContentPostProcessor = {
	prefix?: (templatePath: string) => string;
	write?: (o: Record<string, unknown>) => string;
};

export const contentPostProcessor: Record<string, ContentPostProcessor> = {
	'.yaml': {
		prefix: (templatePath) => '# ' + notice(templatePath) + '\n',
		write: (content) => yaml.dump(content, { indent: 2 }),
	},
	'.json': {
		prefix: undefined, // json doesn't accept comments
		write: (content) => JSON.stringify(content, null, 2) + '\n',
	},
	'.js': {
		prefix: (templatePath) => '// ' + notice(templatePath) + '\n',
		write: undefined, // cant be templated as an object
	},
};
