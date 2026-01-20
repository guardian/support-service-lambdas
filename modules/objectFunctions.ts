import { difference } from '@modules/arrayFunctions';

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
): {
	[K in keyof T]: T[K];
} extends infer V
	? V[keyof V][]
	: never {
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- allowed in utility function - get back type lost by Object.values
	return Object.values(libs) as any;
}

export function objectFromEntries<K extends string, V>(
	libs: Array<readonly [K, V]>,
): Record<K, V> {
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- allowed in utility function - get back type lost by Object.keys
	return Object.fromEntries(libs) as Record<K, V>;
}

export function objectEntries<T extends Record<string, unknown>>(
	theMappings: T,
): Array<{ [K in keyof T]: [K, T[K]] }[keyof T]> {
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- allowed in utility function - get back type lost by Object.entries
	return Object.entries(theMappings) as Array<
		{ [K in keyof T]: [K, T[K]] }[keyof T]
	>;
}

export function objectLeftJoin<K extends string, VA, VB, KR extends K>(
	l: Record<K, VA>,
	r: Record<KR, VB>,
): [VA, VB | undefined][] {
	const lKeys = objectKeys(l);
	return lKeys.map(
		(key) => [l[key], key in r ? r[key as KR] : undefined] as const,
	);
}

export function objectJoin<K extends string, VA, VB>(
	l: Record<K, VA>,
	r: Record<K, VB>,
): [VA, VB][] {
	const lKeys = objectKeys(l);
	const [onlyInL, onlyInR] = difference(lKeys, objectKeys(r));

	if (onlyInL.length + onlyInR.length !== 0) {
		throw new Error(
			`Keys do not match between records: onlyInL: ${onlyInL} onlyInR: ${onlyInR}`,
		);
	}

	return lKeys.map((key) => [l[key], r[key]] as const);
}

/**
 * This does a mapValue on a specific named property, useful if we want to replace
 * just e.g. the ratePlans and keep everything else the same.
 *
 * @param obj
 * @param property
 * @param mapFn
 */
export function mapProperty<T, K extends keyof T, V>(
	obj: T,
	property: K,
	mapFn: (value: T[K]) => V,
): Omit<T, K> & { [P in K]: V } {
	return {
		...obj,
		[property]: mapFn(obj[property]),
	};
}
