import * as path from 'path';
import { contentPostProcessor } from '../../data/snippets/notices';
import type { InsertChunks } from '../../data/types';
import {
	type SeedFileResult,
	type SeedInsertionResult,
} from '../steps/insertChunks';

/**
 * The union of all values a template function may return.
 * - `string` — written verbatim to the target file.
 * - `Record<string, unknown>` — serialised by file extension (`.yaml` via js-yaml, `.json` via JSON.stringify).
 * - `null` — skips this template entirely (used for conditional files).
 * Insertion templates (`.inserts.ts` files) return {@link InsertChunks} and are identified by `kind: 'insertion'` on the {@link Template}.
 */
export type TemplateContent = string | Record<string, unknown> | null;

interface TemplateBase {
	targetPath: string;
	templateFilename: string;
}

export type FileTemplate<Definition> = TemplateBase & {
	kind: 'file';
	value: TemplateContent | ((data: Definition) => TemplateContent);
};

export type InsertionTemplate<Definition> = TemplateBase & {
	kind: 'insertion';
	value: InsertChunks | ((data: Definition) => InsertChunks);
};

export type Template<Definition> =
	| FileTemplate<Definition>
	| InsertionTemplate<Definition>;

/**
 * Evaluates all templates against `opts`, splitting results into new files and
 * injections into existing files. Null-returning templates are dropped.
 * Used by both the managed-file pipeline and the seed pipeline.
 */
export function applyTemplates<Definition>(
	opts: Definition,
	templates: Array<Template<Definition>>,
	insertWarningComment: boolean = false,
): { files: SeedFileResult[]; insertions: SeedInsertionResult[] } {
	const fileTemplates = templates.filter((r) => r.kind === 'file');
	const insertionTemplates = templates.filter((r) => r.kind === 'insertion');

	return {
		files: applyFileTemplates(opts, fileTemplates, insertWarningComment),
		insertions: applyInsertionTemplates(insertionTemplates, opts),
	};
}

export function applyFileTemplates<Definition>(
	opts: Definition,
	fileTemplates: Array<FileTemplate<Definition>>,
	insertWarningComment: boolean,
) {
	return fileTemplates.flatMap((template) => {
		const rawContent =
			typeof template.value === 'function'
				? template.value(opts)
				: template.value;

		if (rawContent === null) {
			return [];
		}

		return [
			{
				kind: template.kind,
				targetPath: template.targetPath,
				content: serializeContent(
					rawContent,
					template.targetPath,
					template.templateFilename,
					insertWarningComment,
				),
				templateFilename: template.templateFilename,
			} satisfies SeedFileResult,
		];
	});
}

function applyInsertionTemplates<Definition>(
	insertionTemplates: Array<InsertionTemplate<Definition>>,
	opts: Definition,
) {
	return insertionTemplates.map((template) => {
		const chunks =
			typeof template.value === 'function'
				? template.value(opts)
				: template.value;
		return {
			kind: template.kind,
			targetPath: template.targetPath,
			templateFilename: template.templateFilename,
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
