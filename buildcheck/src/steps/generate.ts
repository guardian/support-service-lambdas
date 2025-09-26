import * as path from 'path';
import { build } from '../../data/build';
import { generateWarningFile } from '../../data/snippets/BUILDCHECK.md';
import {
	applyHandlerTemplates,
	applyRootTemplates,
} from '../dynamic/templater';
import type { GeneratedFile } from './generatedFile';

// generates files across the whole repository
export function generate(): GeneratedFile[] {
	const handlersFiles = build.handlers.flatMap((pkg) => {
		const handlerFiles = withWarningFile(applyHandlerTemplates(pkg), '../..');
		const filesRelativeToRoot = mapRelativePath(handlerFiles, (relativePath) =>
			path.join('handlers', pkg.name, relativePath),
		);
		return filesRelativeToRoot;
	});
	const rootFiles = applyRootTemplates(build.root);
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
