import { GeneratorConfig, HandlerConfig } from '../data/config';
import { filterSingle } from '../util/arrayFunctions';
import { applyTemplates, Template } from '../util/templater';
import * as path from 'path';
import defaultTemplates from '../data/generated';

// generates files across the whole repository
export function generateSteps(
	config: GeneratorConfig,
	maybePackageName?: string,
	templates: Template[] = defaultTemplates,
): GeneratedFile[] {
	const packagesToGenerate = maybePackageName
		? filterSingle(
				config.packages,
				(p) => p.name === maybePackageName,
				`Package ${maybePackageName} not found in configuration`,
			)
		: config.packages;

	return packagesToGenerate.flatMap((pkg) => {
		const handlerFiles = generateHandler(pkg, templates);
		const filesRelativeToRoot = mapRelativePath(handlerFiles, (relativePath) =>
			path.join('handlers', pkg.name, relativePath),
		);
		return filesRelativeToRoot;
	});
}

function mapRelativePath(
	files: GeneratedFile[],
	pathMapper: (relativePath: string) => string,
): GeneratedFile[] {
	return files.map((file) => ({
		relativePath: pathMapper(file.relativePath),
		content: file.content,
	}));
}

// generates all known files across a single handler according to any custom data
export function generateHandler(
	pkg: HandlerConfig,
	templates: Template[],
): GeneratedFile[] {
	const files = applyTemplates(pkg, templates);

	const gitignoreFile = generateHandlerGitignore(
		files.map((f) => '/' + f.relativePath),
	);

	return [...files, gitignoreFile];
}

function generateHandlerGitignore(generatedFiles: string[]): GeneratedFile {
	return {
		relativePath: '.gitignore',
		content: [
			'# Auto generated .gitignore by buildgen ' + __filename,
			'/.gitignore',
			...generatedFiles,
			'',
		].join('\n'),
	};
}

export interface GeneratedFile {
	relativePath: string;
	content: string;
}
