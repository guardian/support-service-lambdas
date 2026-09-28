import {
	difference,
	getSingleOrThrow,
	partitionByType,
} from './arrayFunctions';
import { getIfDefined } from './nullAndUndefined';

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
 * optional context used by objectJoinBijective to render a comprehensive,
 * diff-style mismatch message: describe turns a key/value into something
 * meaningful (e.g. `${value.name} (${key})`) instead of the bare key, and
 * labels name what left/right actually represent (e.g. "catalog charges").
 * If omitted, keys are used as-is and left/right are labelled generically.
 */
export type ObjectJoinBijectiveOptions<K, VA, VB> = {
	describeL?: (value: VA, key: K) => string;
	describeR?: (value: VB, key: K) => string;
	labels?: { left: string; right: string };
};

const MAX_MATCHED_ENTRIES_LISTED = 20;

/**
 * joins two objects by their keys, throwing if there isn't an exact match.
 *
 * The thrown message is a diff: treating `l` as the "before" and `r` as the
 * "after", matched keys are listed with a leading space, keys missing from
 * `r` (only in `l`) with a leading '-', and keys missing from `l` (only in
 * `r`) with a leading '+' - so it's comprehensive without callers having to
 * redo the diff themselves. The matched list is capped so a small number of
 * mismatches isn't drowned out by a large number of matches.
 *
 * @param l
 * @param r
 * @param options
 */
export function objectJoinBijective<K extends string, VA, VB>(
	l: Map<K, VA>,
	r: Map<K, VB>,
	options?: ObjectJoinBijectiveOptions<K, VA, VB>,
): Array<[VA, VB]> {
	const lEntries: Array<[K, VA]> = [...l.entries()];
	const [onlyInL, onlyInR] = difference(
		lEntries.map(([k]) => k),
		[...r.keys()],
	);

	if (onlyInL.length + onlyInR.length !== 0) {
		throw new Error(describeJoinMismatch(l, r, onlyInL, onlyInR, options));
	}

	return lEntries.map(([key, lValue]) => {
		const rValue = getIfDefined(r.get(key), 'already proved it is there');
		return [lValue, rValue] as const;
	});
}

function describeJoinMismatch<K extends string, VA, VB>(
	l: Map<K, VA>,
	r: Map<K, VB>,
	onlyInL: K[],
	onlyInR: K[],
	options?: ObjectJoinBijectiveOptions<K, VA, VB>,
): string {
	const leftLabel = options?.labels?.left ?? 'left';
	const rightLabel = options?.labels?.right ?? 'right';
	const describeL = options?.describeL ?? ((_value: VA, key: K) => key);
	const describeR = options?.describeR ?? ((_value: VB, key: K) => key);
	const onlyInLSet = new Set(onlyInL);
	const onlyInRSet = new Set(onlyInR);

	const matchedLines = [...l.entries()]
		.filter(([key]) => !onlyInLSet.has(key))
		.map(([key, value]) => `  "${describeL(value, key)}" - OK`);
	const removedLines = onlyInL.map(
		(key) =>
			`- "${describeL(getIfDefined(l.get(key), 'already confirmed present'), key)}" - only in ${leftLabel}`,
	);
	const addedLines = [...r.entries()]
		.filter(([key]) => onlyInRSet.has(key))
		.map(
			([key, value]) => `+ "${describeR(value, key)}" - only in ${rightLabel}`,
		);

	const truncationNote =
		matchedLines.length > MAX_MATCHED_ENTRIES_LISTED
			? [
					`  ...(showing ${MAX_MATCHED_ENTRIES_LISTED} of ${matchedLines.length} matched)`,
				]
			: [];

	return [
		`Different keys detected when joining ${leftLabel} with ${rightLabel}:`,
		...matchedLines.slice(0, MAX_MATCHED_ENTRIES_LISTED),
		...truncationNote,
		...removedLines,
		...addedLines,
	].join('\n');
}

/**
 * this goes through the object, applying the function to each value.  If the result is true, the key and value go into the first object
 * otherwise they goes into the second object.
 *
 * @param obj
 * @param fn
 */
export const partitionByValueType = <K, V, U extends V>(
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
			// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- ok in utility function
			fail.set(key, value as Exclude<V, U>);
		}
	});
	return [pass, fail];
};
