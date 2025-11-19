export function objectKeys<O extends object>(libs: O): (keyof O)[] {
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- allowed in utility function - get back type lost by Object.keys
	return Object.keys(libs) as (keyof O)[];
}

export function objectKeysNonEmpty<
	O extends object &
		(keyof O extends never ? ['O must have at least one key'] : unknown),
>(libs: O): [keyof O, ...(keyof O)[]] {
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- allowed in utility function - get back type lost by Object.keys
	const keys = Object.keys(libs);
	if (keys.length === 0) throw new Error('empty object');
	return keys as [keyof O, ...(keyof O)[]];
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
