import type { ZodObject, ZodRawShape, ZodTypeAny } from 'zod';

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
export type SeedIndex<T> = {
	argsSchema: ZodObject<ZodRawShape, 'strip', ZodTypeAny, T, unknown>;
	postProcessCommands: (opts: T) => string[];
	resolveTargetPath: (path: string, opts: T) => string;
};
