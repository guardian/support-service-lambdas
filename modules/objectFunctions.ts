import { difference } from '@modules/arrayFunctions';

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
	return keys as [keyof O, ...Array<keyof O>];
}

export function objectValues<V, T extends Record<string, V>>(
	libs: T,
): Array<NonUndefined<T[keyof T]>> {
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- allowed in utility function - get back type lost by Object.values
	return Object.values(libs) as Array<NonUndefined<T[keyof T]>>;
}

export function objectFromEntries<K extends string, V>(
	libs: Array<readonly [K, V]>,
): Record<K, V> {
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- allowed in utility function - get back type lost by Object.keys
	return Object.fromEntries(libs) as Record<K, V>;
}

type NonUndefined<T> = T extends undefined ? never : T;

export function objectEntries<T extends object>(
	theMappings: T | {},
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
 * joins two objects by their keys, if a left is missing from the right, use undefined
 * @param l
 * @param r
 */
export function objectLeftJoin<K extends string, VA, VB, KR extends K>(
	l: Record<K, VA>,
	r: Record<KR, VB>,
): Array<[VA, VB | undefined]> {
	const lKeys = objectKeys(l);
	return lKeys.map(
		(key) => [l[key], key in r ? r[key as unknown as KR] : undefined] as const,
	);
}

/**
 * joins two objects by their keys, throwing away any entries that don't exist in both
 * @param l
 * @param r
 */
export function objectInnerJoin<K extends string, VA, VB>(
	l: Record<K, VA>,
	r: Record<K, VB>,
): Array<[VA, VB]> {
	const lKeys = objectKeys(l);
	return lKeys.flatMap((key) => (key in r ? [[l[key], r[key]] as const] : []));
}

/**
 * joins two objects by their keys, throwing if there isn't an exact match
 * @param l
 * @param r
 */
export function objectJoinBijective<K extends string, VA, VB>(
	l: Record<K, VA>,
	r: Record<K, VB>,
): Array<[VA, VB]> {
	const lKeys = objectKeys(l);
	const [onlyInL, onlyInR] = difference(lKeys as K[], objectKeys(r) as K[]);

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
 * @param propertyName
 * @param mapFn
 */
export function mapValue<T, K extends keyof T, V>(
	obj: T,
	propertyName: K,
	mapFn: (value: T[K]) => V,
): Omit<T, K> & Record<K, V> {
	return {
		...obj,
		[propertyName]: mapFn(obj[propertyName]),
	};
}

/**
 * this goes through the object, applying the function to each value.  If the result is true, the key and value go into the first object
 * otherwise they goes into the second object.
 *
 * @param obj
 * @param fn
 */
export const partitionObjectByValueType = <
	T extends object,
	U extends T[keyof T],
>(
	obj: T,
	fn: (v: T[keyof T], k: keyof T) => v is U,
): [Record<string, U>, Record<string, Exclude<T[keyof T], U>>] => {
	const pass: Record<string, U> = {};
	const fail: Record<string, Exclude<T[keyof T], U>> = {};
	for (const key in obj) {
		const value = obj[key];
		if (fn(value, key)) {
			pass[key] = value;
		} else {
			fail[key] = value as Exclude<T[keyof T], U>;
		}
	}
	return [pass, fail];
};
