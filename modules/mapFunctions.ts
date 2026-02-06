import {
	difference,
	getSingleOrThrow,
	partitionByType,
} from '@modules/arrayFunctions';
import { getIfDefined } from '@modules/nullAndUndefined';

export const mapValuesMap = <K, V, RES>(
	obj: Map<K, V>,
	fn: (v: V, k: K) => RES | undefined,
): Map<K, RES> => {
	const result = new Map<K, RES>();
	for (const [key, value] of obj.entries()) {
		const transformed = fn(value, key);
		if (transformed !== undefined) {
			result.set(key, transformed);
		}
	}
	return result;
};

/**
 * groupCollect creates an object where the keys are the first element returned by toMaybeEntry,
 * and the values are the second element.
 * If the function returns undefined, the item is discarded.
 *
 * @param array
 * @param toMaybeEntry
 */
export const groupCollectMap = <T, R, K>(
	array: readonly T[],
	toMaybeEntry: (item: T) => readonly [K, R] | undefined,
): Map<K, R[]> => {
	return array.reduce<Map<K, R[]>>((acc: Map<K, R[]>, item: T) => {
		const keyValue = toMaybeEntry(item);
		if (keyValue !== undefined) {
			const [key, value] = keyValue;
			const group: R[] = acc.get(key) ?? [];
			group.push(value);
			acc.set(key, group);
		}
		return acc;
	}, new Map<K, R[]>());
};

/**
 * this does a groupBy and then extracts a single item from each group.
 *
 * This is safer than objectFromEntries which silently discards clashes.
 *
 * @param ratePlanCharges
 * @param by
 * @param msg
 */
export function groupByUniqueOrThrowMap<T, K extends string>(
	ratePlanCharges: T[],
	by: (t: T) => K,
	msg: string,
): Map<K, T> {
	return groupCollectByUniqueOrThrowMap(
		ratePlanCharges,
		(a) => [by(a), a],
		msg,
	);
}

/**
 * this does a groupCollect and then extracts a single item.
 *
 * @param ratePlanCharges
 * @param by
 * @param map
 * @param msg
 */
export function groupCollectByUniqueOrThrowMap<T, R, K>(
	ratePlanCharges: T[],
	by: (t: T) => readonly [K, R] | undefined,
	msg: string,
): Map<K, R> {
	return mapValuesMap(groupCollectMap(ratePlanCharges, by), (arr) =>
		getSingleOrThrow(
			arr,
			(msg2) => new Error('duplicate keys: ' + msg + ', ' + msg2),
		),
	);
}

/**
 * joins two objects by their keys, if a left is missing from the right, use undefined
 * @param l
 * @param r
 */
export function objectLeftJoin<K, VA, VB, KR extends K>(
	l: Map<K, VA>,
	r: Map<KR, VB>,
): Array<[VA, VB | undefined, K]> {
	const lEntries = [...l.entries()];
	return lEntries.map(
		// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- don't know whether this KR overlaps with K
		([key, lValue]) => [lValue, r.get(key as unknown as KR), key] as const,
	);
}

/**
 * this does a join between the keys of left and right, however if any item in `l`
 * can't be looked up in r, it throws an error
 */
export function joinAllLeft<K, VA, VB, KR extends K>(
	l: Map<K, VA>,
	r: Map<KR, VB>,
) {
	const [linked, errors] = partitionByType(
		objectLeftJoin(
			// attaches any products not in the (filtered) catalog to `undefined`
			l,
			r,
		),
		(pair): pair is [VA, VB, K] => pair[1] !== undefined,
	);
	if (errors.length > 0) {
		throw new Error(
			`left had an id that was missing from the right lookup ${errors.length}: ` +
				JSON.stringify(errors),
		);
	}
	return linked;
}

/**
 * joins two objects by their keys, throwing if there isn't an exact match
 * @param l
 * @param r
 */
export function objectJoinBijective<K extends string, VA, VB>(
	l: Map<K, VA>,
	r: Map<K, VB>,
): Array<[VA, VB]> {
	const lEntries: Array<[K, VA]> = [...l.entries()];
	const [onlyInL, onlyInR] = difference(
		lEntries.map(([k]) => k),
		[...r.keys()],
	);

	if (onlyInL.length + onlyInR.length !== 0) {
		throw new Error(
			`Keys do not match between records: onlyInL: ${onlyInL.join(', ')} onlyInR: ${onlyInR.join(', ')}`,
		);
	}

	return lEntries.map(([key, lValue]) => {
		const rValue = getIfDefined(r.get(key), 'already proved it is there');
		return [lValue, rValue] as const;
	});
}

/**
 * this goes through the object, applying the function to each value.  If the result is true, the key and value go into the first object
 * otherwise they goes into the second object.
 *
 * @param obj
 * @param fn
 */
export const partitionMapByValueType = <K, V, U extends V>(
	obj: Map<K, V>,
	fn: (v: V, k: K) => v is U,
): [Map<K, U>, Map<K, Exclude<V, U>>] => {
	const pass: Map<K, U> = new Map<K, U>();
	const fail: Map<K, Exclude<V, U>> = new Map<K, Exclude<V, U>>();
	const entries = [...obj.entries()];
	entries.forEach(([key, value]) => {
		if (fn(value, key)) {
			pass.set(key, value);
		} else {
			// eslint-disable-next-line @typescript-eslint/consistent-type-assertions - ok in utility function
			fail.set(key, value as Exclude<V, U>);
		}
	});
	return [pass, fail];
};
