import type { ExpandRegistryEntry } from '@modules/zuora/objectQuery/queries/types';

/** The responseKey(s) that a given expand entry maps to (its object key). */
type ResponseKeyOf<
	TRegistry extends Record<string, ExpandRegistryEntry>,
	E extends keyof TRegistry,
> = E extends keyof TRegistry ? keyof TRegistry[E] : never;

/** Branded error surfaced when duplicate responseKeys are detected. */
type HasDuplicateResponseKey = {
	__error: 'Two expand keys map to the same responseKey - remove the redundant one';
};

/** True when key `K`'s responseKey is also produced by another chosen key. */
type ExpandKeySharesResponseKey<
	TRegistry extends Record<string, ExpandRegistryEntry>,
	TAll extends keyof TRegistry,
	K extends keyof TRegistry,
> = [Exclude<TAll, K>] extends [never]
	? false
	: ResponseKeyOf<TRegistry, K> extends ResponseKeyOf<
				TRegistry,
				Exclude<TAll, K>
		  >
		? true
		: false;

/**
 * Homomorphic mapped type over the chosen expand-key tuple. Each element keeps
 * its literal key type unless its responseKey collides with another chosen key,
 * in which case the element type becomes `HasDuplicateResponseKey` so the
 * offending array entry fails to type-check exactly at the call site. Being
 * homomorphic over the tuple (`[I in keyof TKeys]`), it preserves inference of
 * the chosen keys.
 *
 * Example: `subscriptions`, `subscriptions.rateplans`, and
 * `subscriptions.rateplans.rateplancharges` can all map to the same response
 * key (`subscriptions`). Selecting more than one of those expands is invalid
 * because the resulting response shape would collide on that key.
 */
export type DoesNotHaveDuplicateResponseKey<
	TRegistry extends Record<string, ExpandRegistryEntry>,
	TKeys extends ReadonlyArray<keyof TRegistry>,
> = {
	[I in keyof TKeys]: ExpandKeySharesResponseKey<
		TRegistry,
		TKeys[number],
		Extract<TKeys[I], keyof TRegistry>
	> extends true
		? HasDuplicateResponseKey
		: TKeys[I];
};
