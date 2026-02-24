type DistributedKeyof<T> = T extends unknown ? keyof T : never;
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

export function objectFromEntries<K extends string, V>(
	libs: Array<readonly [K, V]>,
): Record<K, V> {
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- allowed in utility function - get back type lost by Object.keys
	return Object.fromEntries(libs) as Record<K, V>;
}

type NonUndefined<T> = T extends undefined ? never : T;

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
