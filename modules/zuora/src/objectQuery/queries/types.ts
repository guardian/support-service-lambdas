import type { ZodTypeAny } from 'zod';

/*
These are the types to define an object query for each object

Using these gives type safety and auto complete.
 */

/**
 * One entry in an expand registry.
 *
 * This should usually be a single-key object where the key is the response
 * field populated by that expand and the value is the zod schema for that
 * response field, e.g. `{ subscriptions: z.array(...) }`.
 *
 * Duplicate response keys across selected expands are invalid because they
 * would collide in the parsed response shape.
 */
export type ExpandRegistryEntry = Record<string, ZodTypeAny>;
export type ObjectQueryFieldRegistry = Record<string, ZodTypeAny>;
export type ObjectQueryExpandRegistry = Record<string, ExpandRegistryEntry>;
/** The set of fields an object type allows in `filter`/`sort` clauses. */
export type ObjectQueryQueryableFields = readonly string[];
