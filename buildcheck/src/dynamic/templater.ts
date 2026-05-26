import * as path from 'path';
import { contentPostProcessor } from '../../data/snippets/notices';
import type {
	AnyTemplate,
	FileTemplate,
	InsertChunks,
	InsertionTemplate,
	TemplateContent,
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
 * Used by both the managed-file pipeline and the seed pipeline.
 */
export function applyTemplates<Definition>(
	opts: Definition,
	groupDir: string,
	templates: Array<AnyTemplate<Definition>>,
	insertWarningComment: boolean = false,
): { files: GeneratedFile[]; insertions: SeedInsertionResult[] } {
	const fileTemplates = templates.filter((r) => r.kind === 'file');
	const insertionTemplates = templates.filter((r) => r.kind === 'insertion');

	return {
		files: applyFileTemplates(
			opts,
			groupDir,
			fileTemplates,
			insertWarningComment,
		),
		insertions: applyInsertionTemplates(opts, insertionTemplates),
	};
}

export function applyFileTemplates<Definition>(
	opts: Definition,
	groupDir: string,
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

		const templateFilename = path.join(groupDir, template.relativeName);
		const targetPath = toTargetPath(template.relativeName);
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
			targetPath: toTargetPath(template.relativeName),
			chunks,
		} satisfies SeedInsertionResult;
	});
}

/** Derive the target path in the repo from a template filename (relative to templates/).
 *  e.g. `foo.json.ts`       -> `foo.json`
 *       `foo.ts.inserts.ts` -> `foo.ts`  (insertion: strip .inserts.ts)
 */
export function toTargetPath(relPath: string): string {
	if (relPath.endsWith('.inserts.ts')) {
		return relPath.slice(0, -'.inserts.ts'.length);
	}
	return relPath.endsWith('.ts') ? relPath.slice(0, -3) : relPath;
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
