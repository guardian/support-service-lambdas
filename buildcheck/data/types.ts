/**
 * The union of all values a file template function may return.
 *
 * - `string` — written verbatim to the target file.
 * - `Record<string, unknown>` — serialised by file extension (`.yaml` via js-yaml, `.json` via JSON.stringify).
 * - `null` — skips this template entirely (used for conditional files).
 *
 * Note: insertion templates (files ending in `.inserts.ts`) return {@link InsertChunks}
 */
export type TemplateContent = string | Record<string, unknown> | null;

/**
 * One or more injections to apply to an existing file.
 *
 * This is returned by templates ending in .inject.ts
 */
export type InsertChunks = Array<{
	marker: string;
	content: string;
}>;

/**
 * A single entry in a generated template index (_generated_tsIndex.ts).
 * Represents a file template (never an insertion).
 * Used by managed template groups (handler, module) which never have insertions.
 */
export type FileTemplate<T> = {
	kind: 'file';
	relativeName: string;
	value: TemplateContent | ((data: T) => TemplateContent);
};

/**
 * A single entry in a generated template index (_generated_tsIndex.ts).
 * Represents an insertion template.
 */
export type InsertionTemplate<T> = {
	kind: 'insertion';
	relativeName: string;
	value: InsertChunks | ((data: T) => InsertChunks);
};

/**
 * Union of file and insertion template entries.
 * Used by seed groups which may contain either kind.
 */
export type AnyTemplate<T> = FileTemplate<T> | InsertionTemplate<T>;
