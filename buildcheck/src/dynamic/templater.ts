import * as path from 'path';
import { contentPostProcessor } from '../../data/snippets/notices';
import type {
	AnyTemplate,
	FileTemplate,
	InsertChunks,
	InsertionTemplate,
	TemplateContent,
	TemplateIndex,
} from '../../data/types';

export interface GeneratedFile {
	readonly kind: 'file';
	/**
	 * relative path to the repo root
	 */
	targetPath: string;
	content: string;
	/**
	 * used for the snapshot test names
	 */
	templateFilename: string;
}

export interface SeedInsertionResult {
	readonly kind: 'insertion';
	targetPath: string;
	chunks: InsertChunks;
}

/**
 * Evaluates all templates against `opts`, splitting results into new files and
 * injections into existing files. Null-returning templates are dropped.
 */
export function applyTemplates<Definition>(
	opts: Definition,
	templates: TemplateIndex<AnyTemplate<Definition>>,
): { files: GeneratedFile[]; insertions: SeedInsertionResult[] } {
	const fileTemplates = templates.templates.filter((r) => r.kind === 'file');
	const insertionTemplates = templates.templates.filter(
		(r) => r.kind === 'insertion',
	);

	return {
		files: applyFileTemplates(
			opts,
			{ templateDir: templates.templateDir, templates: fileTemplates },
			false,
		),
		insertions: applyInsertionTemplates(opts, insertionTemplates),
	};
}

/**
 * as applyTemplates above but it only operates on file templates, not insertions
 */
export function applyFileTemplates<Definition>(
	opts: Definition,
	index: TemplateIndex<FileTemplate<Definition>>,
	insertWarningComment: boolean,
): GeneratedFile[] {
	return index.templates.flatMap((template) => {
		const rawContent =
			typeof template.value === 'function'
				? template.value(opts)
				: template.value;

		if (rawContent === null) {
			return [];
		}

		const templateFilename = path.join(
			index.templateDir,
			template.relativeName,
		);
		const targetPath = template.relativeName.slice(0, -'.ts'.length);
		return [
			{
				kind: template.kind,
				targetPath,
				content: serializeContent(
					rawContent,
					targetPath,
					templateFilename,
					insertWarningComment,
				),
				templateFilename,
			} satisfies GeneratedFile,
		];
	});
}

function applyInsertionTemplates<Definition>(
	opts: Definition,
	insertionTemplates: Array<InsertionTemplate<Definition>>,
) {
	return insertionTemplates.map((template) => {
		const chunks =
			typeof template.value === 'function'
				? template.value(opts)
				: template.value;
		return {
			kind: template.kind,
			targetPath: template.relativeName.slice(0, -'.inserts.ts'.length),
			chunks,
		} satisfies SeedInsertionResult;
	});
}

function serializeContent(
	content: TemplateContent,
	relativePath: string,
	templatePath: string,
	insertWarningComment: boolean,
): string {
	if (content === null) {
		throw new Error(
			`serializeContent called with null content for ${templatePath} — null templates should have been filtered out`,
		);
	}
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
