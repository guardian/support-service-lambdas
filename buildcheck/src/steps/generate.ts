import * as path from 'path';
import type { GeneratorConfig, HandlerConfig } from '../../data/build';
import { generatorConfig } from '../../data/build';
import { generateWarningFile } from '../../data/snippets/BUILDCHECK.md';
import type { Template } from '../util/templater';
import { applyTemplates } from '../util/templater';
import type { GeneratedFile } from './generatedFile';
import defaultTemplates from './generatedMappings';

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
	return withWarningFile(files, '.');
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

function withWarningFile(
	files: Array<{ relativePath: string; content: string }>,
	pathToRoot: string,
) {
	const warningFile = generateWarningFile(
		files.map((f) => f.relativePath),
		pathToRoot,
	);
	return [...files, warningFile];
}

// generates all known files across a single handler according to any custom data
export function generateHandler(
	pkg: HandlerConfig,
	templates: Template[],
): GeneratedFile[] {
	return withWarningFile(applyTemplates(pkg, templates), '../..');
}
