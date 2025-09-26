import * as path from 'path';
import { build } from '../../data/build';
import { generateWarningFile } from '../../data/snippets/BUILDCHECK.md';
import {
	handlerTemplates,
	rootTemplates,
} from '../dynamic/generated/generatedMappings';
import { applyTemplates } from '../dynamic/templater';
import type { GeneratedFile } from './generatedFile';

// generates files across the whole repository
export function generate(): GeneratedFile[] {
	const handlersFiles = build.handlers.flatMap((pkg) => {
		const handlerFiles = withWarningFile(
			applyTemplates(pkg, handlerTemplates),
			'../..',
		);
		const filesRelativeToRoot = mapRelativePath(handlerFiles, (relativePath) =>
			path.join('handlers', pkg.name, relativePath),
		);
		return filesRelativeToRoot;
	});
	const rootFiles = applyTemplates(build.root, rootTemplates);
	return withWarningFile([...handlersFiles, ...rootFiles], '.');
}

function mapRelativePath(
	files: GeneratedFile[],
	pathMapper: (relativePath: string) => string,
): GeneratedFile[] {
	return files.map((file) => ({
		relativePath: pathMapper(file.relativePath),
		content: file.content,
		templatePath: file.templatePath,
	}));
}

function withWarningFile(files: GeneratedFile[], pathToRoot: string) {
	const warningFile = generateWarningFile(
		files.map((f) => f.relativePath),
		pathToRoot,
	);
	return [...files, warningFile];
}
