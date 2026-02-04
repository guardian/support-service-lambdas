import { difference } from '@modules/arrayFunctions';

export function objectKeys<O extends object>(libs: O): Array<keyof O> {
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- allowed in utility function - get back type lost by Object.keys
	return Object.keys(libs) as Array<keyof O>;
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

export function objectValues<V, T extends Record<string, V>>(
	libs: T,
): Array<T[keyof T]> {
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- allowed in utility function - get back type lost by Object.values
	return Object.values(libs) as Array<T[keyof T]>;
}

export function objectFromEntries<K extends string, V>(
	libs: Array<readonly [K, V]>,
): Record<K, V> {
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- allowed in utility function - get back type lost by Object.keys
	return Object.fromEntries(libs) as Record<K, V>;
}

export function objectEntries<K extends string, V>(
	theMappings: Record<K, V> | Partial<Record<K, V>>,
) {
	return Object.entries(theMappings) as Array<[K, V]>;
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

/**
 * joins two objects by their keys, throwing if there isn't an exact match
 * @param l
 * @param r
 */
export function objectJoinBijective<K extends string, VA, VB>(
	l: Record<K, VA>,
	r: Record<K, VB>,
): Array<[VA, VB, K]> {
	const lKeys = objectKeys(l);
	const [onlyInL, onlyInR] = difference(lKeys, objectKeys(r));

	if (onlyInL.length + onlyInR.length !== 0) {
		throw new Error(
			`Keys do not match between records: onlyInL: ${onlyInL} onlyInR: ${onlyInR}`,
		);
	}

	return lKeys.map((key) => [l[key], r[key], key] as const);
}
