export type DistributedKeyof<T> = T extends unknown ? keyof T : never;
export function objectKeys<O extends object>(
	libs: O,
): Array<DistributedKeyof<O>> {
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- allowed in utility function - get back type lost by Object.keys
	return Object.keys(libs) as Array<DistributedKeyof<O>>;
}

export function objectKeysNonEmpty<
	O extends object &
		(keyof O extends never ? ['O must have at least one key'] : unknown),
>(libs: O): [keyof O, ...Array<keyof O>] {
	const keys = Object.keys(libs);
	if (keys.length === 0) {
		throw new Error('empty object');
	}
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- allowed in utility function - get back type lost by Object.keys
	return keys as [keyof O, ...Array<keyof O>];
}

type DistributedValues<T> = T extends unknown ? T[keyof T] : never;
export function objectValues<T extends object>(
	libs: T,
): Array<NonUndefined<DistributedValues<T>>> {
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- allowed in utility function - get back type lost by Object.values
	return Object.values(libs) as Array<NonUndefined<DistributedValues<T>>>;
}

export function objectFromEntries<K extends PropertyKey, V>(
	libs: Array<readonly [K, V]>,
): Record<K, V> {
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- allowed in utility function - get back type lost by Object.keys
	return Object.fromEntries(libs) as Record<K, V>;
}

export type NonUndefined<T> = T extends undefined ? never : T;

/** Distributes a union of object types into their intersection. */
export type UnionToIntersection<U> = (
	U extends unknown ? (x: U) => void : never
) extends (x: infer I) => void
	? I
	: never;

/**
 * Merges all values of an object (which are themselves object fragments)
 * into a single intersection type. Useful when values are e.g. Zod shape fragments.
 */
export function mergeValues<O extends Record<string, Record<string, unknown>>>(
	obj: O,
): UnionToIntersection<O[keyof O]> {
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- allowed in utility function - merging object fragments yields their intersection
	return Object.assign({}, ...Object.values(obj)) as UnionToIntersection<
		O[keyof O]
	>;
}

export function objectEntries<T extends object>(
	theMappings: T,
): Array<
	NonUndefined<
		{
			[K in keyof T]: [K, NonUndefined<T[K]>];
		}[keyof T]
	>
> {
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- allowed in utility function - get back type lost by Object.entries
	return Object.entries(theMappings) as Array<
		NonUndefined<
			{
				[K in keyof T]: [K, NonUndefined<T[K]>];
			}[keyof T]
		>
	>;
}

export function filterEntries<T extends object>(
	obj: T,
	predicate: ([key, value]: {
		[K in keyof T]: [K, T[K]];
	}[keyof T]) => boolean,
) {
	const filtered = objectFromEntries(objectEntries(obj).filter(predicate));
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- utility function
	return filtered as Partial<T>;
}

/**
 * Returns a new object containing only the specified keys, preserving per-key value types.
 */
export function pickKeys<O extends Record<string, unknown>, K extends keyof O>(
	obj: O,
	keys: readonly K[],
): { [P in K]: O[P] } {
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- allowed in utility function - get back type lost by Object.fromEntries
	return Object.fromEntries(keys.map((k) => [k, obj[k]])) as {
		[P in K]: O[P];
	};
}

/**
 * joins two objects by their keys, throwing away any entries that don't exist in both
 * @param l
 * @param r
 */
export function objectInnerJoin<K extends string, VA, VB>(
	l: Record<K, VA>,
	r: Record<K, VB>,
): Array<[VA, VB, K]> {
	const lKeys = objectKeys(l);
	return lKeys.flatMap((key) =>
		key in r ? [[l[key], r[key], key] as const] : [],
	);
}
