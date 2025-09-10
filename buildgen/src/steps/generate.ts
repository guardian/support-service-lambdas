import { generatorConfig, GeneratorConfig, HandlerConfig } from '../data/build';
import { applyTemplates, Template } from '../util/templater';
import * as path from 'path';
import defaultTemplates from './generatedMappings';
import { generateWarningFile } from '../data/snippets/buildgenREADME.txt';

// generates files across the whole repository
export function generate(
	config: GeneratorConfig = generatorConfig,
	templates: Template[] = defaultTemplates,
): GeneratedFile[] {
	const files = config.packages.flatMap((pkg) => {
		const handlerFiles = generateHandler(pkg, templates);
		const filesRelativeToRoot = mapRelativePath(handlerFiles, (relativePath) =>
			path.join('handlers', pkg.name, relativePath),
		);
		return filesRelativeToRoot;
	});
	return withWarningFile(files);
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

function withWarningFile(files: { relativePath: string; content: string }[]) {
	const warningFile = generateWarningFile(files.map((f) => f.relativePath));
	return [...files, warningFile];
}

// generates all known files across a single handler according to any custom data
export function generateHandler(
	pkg: HandlerConfig,
	templates: Template[],
): GeneratedFile[] {
	return withWarningFile(applyTemplates(pkg, templates));
}

export interface GeneratedFile {
	relativePath: string;
	content: string;
}
