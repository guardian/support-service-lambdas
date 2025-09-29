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
		return prependToTargetPath(handlerFiles, ['handlers', pkg.name]);
	});
	const rootFiles = applyTemplates(build.root, rootTemplates);
	return withWarningFile([...handlersFiles, ...rootFiles], '.');
}

function prependToTargetPath(
	files: GeneratedFile[],
	containingPath: string[],
): GeneratedFile[] {
	return files.map((file) => ({
		...file,
		targetPath: path.join(...containingPath, file.targetPath),
	}));
}

function withWarningFile(files: GeneratedFile[], pathToRoot: string) {
	const warningFile = generateWarningFile(
		files.map((f) => f.targetPath),
		pathToRoot,
	);
	return [...files, warningFile];
}
