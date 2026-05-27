import type { ZodObject, ZodRawShape, ZodTypeAny } from 'zod';
import type { AnyTemplate, TemplateIndex } from '../types';

export type { AnyTemplate as TemplateEntry };

/**
 * The contract that every seed index file must satisfy.
 * Each seed exports a default object of this type, which is combined with its
 * template array at code-generation time to produce a {@link DirConfig}.
 */
export type SeedIndex<T> = {
	argsSchema: ZodObject<ZodRawShape, 'strip', ZodTypeAny, T, unknown>;
	/**
	 * shell commands to run after seed files have been written e.g. buildcheck
	 * snapshot updates or cdk test snapshot generation
	 */
	postProcessCommands: (opts: T) => string[];
	/**
	 * used to replace parts of a path dynamically e.g. replacing _handlerName_
	 * with the actual name of the handler
	 */
	resolveTargetPath: (path: string, opts: T) => string;
};

/**
 * this is the information that each seed exports to the main engine.
 */
export type DirConfig<T> = {
	index: SeedIndex<T>;
	templates: TemplateIndex<AnyTemplate<T>>;
};
