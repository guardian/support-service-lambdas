import * as path from 'path';
import { build } from '../../data/build';
import handler_templates from '../../data/managed/handler/_generated_tsIndex';
import module_templates from '../../data/managed/module/_generated_tsIndex';
import { templatesDirName } from '../../data/managed/types';
import { generateWarningFile } from '../../data/snippets/BUILDCHECK.md';
import type { GeneratedFile } from '../dynamic/templater';
import { applyFileTemplates } from '../dynamic/templater';

// generates files across the whole repository
export function generate(repoRoot: string): GeneratedFile[] {
	const handlersFiles = build.handlers.flatMap((pkg) => {
		const handlerFiles = withWarningFile(
			applyFileTemplates(
				pkg,
				path.resolve(
					path.relative(repoRoot, templatesDirName),
					'handlers',
					'templates',
				),
				handler_templates,
				true,
			),
			'../..',
		);
		return prependToTargetPath(handlerFiles, ['handlers', pkg.name]);
	});
	const modulesFiles = build.modules.flatMap((pkg) => {
		const moduleFiles = withWarningFile(
			applyFileTemplates(
				pkg,
				path.resolve(
					path.relative(repoRoot, templatesDirName),
					'modules',
					'templates',
				),
				module_templates,
				true,
			),
			'../..',
		);
		return prependToTargetPath(moduleFiles, ['modules', pkg.name]);
	});
	return withWarningFile([...handlersFiles, ...modulesFiles], '.');
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
