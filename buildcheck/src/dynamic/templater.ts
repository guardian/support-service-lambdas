import * as path from 'path';
import { contentPostProcessor } from '../../data/snippets/notices';
import type { InsertChunks } from '../../data/types';
import type { GeneratedFile } from '../steps/generatedFile';
import {
	isInsertChunks,
	type SeedFileResult,
	type SeedInsertionResult,
	type SeedResult,
} from '../steps/insertChunks';

export type TemplateContent =
	| string
	| Record<string, unknown>
	| InsertChunks
	| null;

export interface Template<Definition> {
	targetPath: string;
	value: TemplateContent | ((data: Definition) => TemplateContent);
	templateFilename: string;
}

export function applyFileTemplates<Definition>(
	pkg: Definition,
	templates: Array<Template<Definition>>,
): GeneratedFile[] {
	const { files, insertions } = applyTemplates(pkg, templates, true);
	if (insertions.length > 0) {
		throw new Error(
			`Partially managed files are not yet supported in managed templates: ${insertions.map((i) => i.templateFilename).join(', ')}`,
		);
	}
	return files;
}

export function applyTemplates<Definition>(
	opts: Definition,
	templates: Array<Template<Definition>>,
	insertWarningComment: boolean = false,
): { files: SeedFileResult[]; insertions: SeedInsertionResult[] } {
	const results = templates.flatMap((template): SeedResult[] => {
		const rawContent =
			typeof template.value === 'function'
				? template.value(opts)
				: template.value;

		if (rawContent === null) {
			return [];
		}

		const targetPath = template.targetPath;

		if (isInsertChunks(rawContent)) {
			return [
				{
					kind: 'insertion',
					targetPath,
					templateFilename: template.templateFilename,
					chunks: rawContent.chunks,
					postProcessCommand: rawContent.postProcessCommand,
					postProcessExpectedFiles: rawContent.postProcessExpectedFiles,
				} satisfies SeedInsertionResult,
			];
		}

		return [
			{
				kind: 'file',
				targetPath,
				content: serializeContent(
					rawContent,
					targetPath,
					template.templateFilename,
					insertWarningComment,
				),
				templateFilename: template.templateFilename,
			} satisfies SeedFileResult,
		];
	});

	return {
		files: results.filter((r): r is SeedFileResult => r.kind === 'file'),
		insertions: results.filter((r) => r.kind === 'insertion'),
	};
}

function serializeContent(
	content: string | Record<string, unknown>,
	relativePath: string,
	templatePath: string,
	insertWarningComment: boolean,
): string {
	const extension = path.extname(relativePath);
	const { prefix, write } = contentPostProcessor[extension];
	const actualPrefix =
		insertWarningComment && prefix ? prefix(templatePath) : '';
	if (typeof content === 'string') {
		return actualPrefix + content;
	} else {
		if (write === undefined) {
			throw new Error(
				`no object serialiser for file type ${extension} on ${templatePath}`,
			);
		}
		return actualPrefix + write(content);
	}
}
