import type { ZodObject, ZodRawShape, ZodTypeAny } from 'zod';

/**
 * A single injection into an existing file.
 * @property marker - A string that uniquely identifies the target line; the content is inserted on the line immediately before it.
 * @property content - The text to insert.
 */
export interface InsertChunk {
	marker: string;
	content: string;
}

/**
 * One or more injections to apply to an existing file.
 */
export type InsertChunks = InsertChunk[];

/**
 * The contract that every seed index file must satisfy.
 * Each seed exports a default object of this type, which is combined with its
 * template array at code-generation time to produce a {@link SeedConfig}.
 *
 * @property argsSchema - A Zod object schema that parses and validates raw CLI
 *   flag strings (e.g. `{ lambdaName: 'my-lambda' }`) into the typed options
 *   object `T`. Field names become the flag names (`--lambdaName=...`).
 * @property postProcessCommands - Shell commands to run in the repo root after
 *   all seed files have been written and injected (e.g. snapshot updates, CDK
 *   test regeneration). Run in order.
 * @property resolveTargetPath - Expands tokens in template target paths.
 *   For example, replacing `_lambdaName_` with the actual lambda name so that
 *   `handlers/_lambdaName_/src/index.ts` becomes
 *   `handlers/my-lambda/src/index.ts`.
 */
export type SeedGenerator<T> = {
	argsSchema: ZodObject<ZodRawShape, 'strip', ZodTypeAny, T, unknown>;
	postProcessCommands: (opts: T) => string[];
	resolveTargetPath: (path: string, opts: T) => string;
};
