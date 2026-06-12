import type { ZodTypeAny } from 'zod';

/*
These are the types to define an object query for each object

Using these gives type safety and auto complete.
 */

/**
 * One entry in an expand registry: an object mapping the single response field
 * name to its zod schema, e.g. `{ subscriptions: z.array(...) }`.
 */
export type ExpandRegistryEntry = Record<string, ZodTypeAny>;
export type ObjectQueryFieldRegistry = Record<string, ZodTypeAny>;
export type ObjectQueryExpandRegistry = Record<string, ExpandRegistryEntry>;
/** The set of fields an object type allows in `filter`/`sort` clauses. */
export type ObjectQueryQueryableFields = readonly string[];
