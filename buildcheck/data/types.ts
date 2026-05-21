import type { ZodObject, ZodRawShape, ZodTypeAny } from 'zod';

/**
 * this represents an insertion into an existing file
 */
export interface InsertChunk {
	marker: string;
	content: string;
	position: 'before';
}

/**
 * this represents one or more insertions into an existing file
 */
export interface InsertChunks {
	chunks: InsertChunk[];
}
export type SeedGenerator<T> = {
	argsSchema: ZodObject<ZodRawShape, 'strip', ZodTypeAny, T, unknown>;
	postProcessCommands: (opts: T) => string[];
	postProcessExpectedFiles: (opts: T) => string[];
	resolveTargetPath: (path: string, opts: T) => string;
};
