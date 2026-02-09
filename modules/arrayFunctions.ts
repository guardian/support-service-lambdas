import { z } from 'zod';
import { objectEntries, objectFromEntries } from '@modules/objectFunctions';

export function isInList<T extends string>(values: readonly [T, ...T[]]) {
	return (productKey: string): productKey is T => {
		return z.enum(values).safeParse(productKey).success;
	};
}

export const sum = <T>(array: T[], fn: (item: T) => number): number => {
	return array.reduce((acc, item) => acc + fn(item), 0);
};
export const sumNumbers = (array: number[]): number => {
	return sum(array, (item) => item);
};
export const groupBy = <T, I extends string>(
	array: readonly T[],
	fn: (item: T) => I,
): Record<I, T[]> => {
	return array.reduce<Record<string, T[]>>((acc, item) => {
		const key = fn(item);
		const group = acc[key] ?? [];
		group.push(item);
		acc[key] = group;
		return acc;
	}, {});
};

export const groupByToMap = <T, I extends string>(
	array: readonly T[],
	fn: (item: T) => I,
): Map<I, T[]> => {
	return array.reduce<Map<I, T[]>>((acc, item) => {
		const key = fn(item);
		const group = acc.get(key) ?? [];
		group.push(item);
		acc.set(key, group);
		return acc;
	}, new Map<I, T[]>());
};

/**
 * groupMap creates an object where its keys are the result of the group function, and the values are the result
 * of the map function
 *
 * @param array
 * @param group
 * @param map
 */
export const groupMap = <T, R>(
	array: readonly T[],
	group: (item: T) => string,
	map: (item: T) => R,
): Record<string, R[]> => {
	return objectFromEntries(
		objectEntries(groupBy(array, group)).map(([key, values]) => [
			key,
			values.map(map),
		]),
	);
};

/**
 * groupCollect creates an object where the keys are the first element returned by toMaybeEntry,
 * and the values are the second element.
 * If the function returns undefined, the item is discarded.
 *
 * @param array
 * @param toMaybeEntry
 */
export const groupCollect = <T, R, K extends string>(
	array: readonly T[],
	toMaybeEntry: (item: T) => readonly [K, R] | undefined,
): Record<K, R[]> => {
	return array.reduce<Record<K, R[]>>(
		(acc, item) => {
			const keyValue = toMaybeEntry(item);
			if (keyValue !== undefined) {
				const [key, value] = keyValue;
				const group = acc[key] ?? [];
				group.push(value);
				acc[key] = group;
			}
			return acc;
		},
		{} as Record<K, R[]>,
	);
};

export const chunkArray = <T>(array: T[], chunkSize: number): T[][] => {
	if (chunkSize <= 0) {
		throw new Error('Chunk size must be greater than 0');
	}
	const result: T[][] = [];
	for (let i = 0; i < array.length; i += chunkSize) {
		result.push(array.slice(i, i + chunkSize));
	}
	return result;
};

export const mapValues = <T extends object, RES>(
	obj: T,
	fn: <K extends keyof T>(v: T[K], k: K) => RES | undefined,
): Record<keyof T, RES> => {
	const res = {} as Record<keyof T, RES>;
	for (const key in obj) {
		const maybeNewValue = fn(obj[key], key);
		if (maybeNewValue !== undefined) {
			res[key] = maybeNewValue;
		}
	}
	return res;
};

export const partition = <T>(
	array: T[],
	predicate: (item: T) => boolean,
): [T[], T[]] => {
	const pass: T[] = [];
	const fail: T[] = [];
	for (const item of array) {
		(predicate(item) ? pass : fail).push(item);
	}
	return [pass, fail];
};

export const partitionByType = <T, U extends T>(
	arr: T[],
	fn: (t: T) => t is U,
): [U[], Array<Exclude<T, U>>] =>
	arr.reduce<[U[], Array<Exclude<T, U>>]>(
		(acc, val) => {
			if (fn(val)) {
				acc[0].push(val);
			} else {
				acc[1].push(val as Exclude<T, U>);
			}
			return acc;
		},
		[[], []],
	);

export const sortBy = <T>(array: T[], fn: (item: T) => string): T[] => {
	return array.sort((posGT, negGT) => {
		const posGTKey = fn(posGT);
		const negGTKey = fn(negGT);
		if (posGTKey > negGTKey) {
			return 1;
		} else if (posGTKey < negGTKey) {
			return -1;
		} else {
			return 0;
		}
	});
};

export const getSingleOrThrow = <T>(
	array: T[],
	error: (msg: string) => Error,
): T => {
	if (array.length > 1) {
		throw error('Array had more than one matching element');
	}
	if (array.length < 1) {
		throw error('Array had no matching elements');
	}
	if (!array[0]) {
		throw error('Matching element was null or undefined');
	}
	return array[0];
};

export const findDuplicates = <T>(array: T[]) =>
	array.filter((item, index) => array.indexOf(item) !== index);

// see SameValueZero column of  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Equality_comparisons_and_sameness#comparing_equality_methods
// objects would work in theory but are tested by identity rather than structurally
export type SafeForDistinct = number | string | undefined | null;

export const distinct = <T extends SafeForDistinct>(array: T[]) =>
	Array.from(new Set(array));

export const arrayToObject = <T>(array: Array<Record<string, T>>) => {
	return array.reduce((acc, val) => {
		return { ...acc, ...val };
	}, {});
};

export function flatten<T>(nested: T[][]): T[] {
	return nested.flatMap((a) => a);
}

export const zipAll = <T, U>(ts: T[], us: U[], defaultT: T, defaultU: U) => {
	const length = Math.max(ts.length, us.length);
	const zipped: Array<[T, U]> = [];

	for (let index = 0; index < length; index++) {
		zipped.push([ts[index] ?? defaultT, us[index] ?? defaultU]);
	}

	return zipped;
};

// like map, but if it returns undefined, it puts it in the second list
export const mapPartition = <U, T>(array: T[], fn: (t: T) => U | undefined) =>
	array.reduce<[U[], T[]]>(
		(acc, val) => {
			const res = fn(val);
			if (res) {
				acc[0].push(res);
			} else {
				acc[1].push(val);
			}
			return acc;
		},
		[[], []],
	);

export const intersection = <T>(a: T[], b: T[]) => {
	const setB = new Set(b);
	return [...new Set(a)].filter((x) => setB.has(x));
};

export const difference = <T>(a: T[], b: T[]) => {
	const setA = new Set(a);
	const setB = new Set(b);
	const onlyInA = [...setA].filter((x) => !setB.has(x));
	const onlyInB = [...setB].filter((x) => !setA.has(x));
	return [onlyInA, onlyInB] as const;
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
export function groupByUniqueOrThrow<T, K extends string>(
	ratePlanCharges: T[],
	by: (t: T) => K,
	msg: string,
): Record<K, T> {
	return groupCollectByUniqueOrThrow(ratePlanCharges, (a) => [by(a), a], msg);
}

/**
 * this does a groupCollect and then extracts a single item.
 *
 * @param ratePlanCharges
 * @param by
 * @param map
 * @param msg
 */
export function groupCollectByUniqueOrThrow<T, R, K extends string>(
	ratePlanCharges: T[],
	by: (t: T) => readonly [K, R] | undefined,
	msg: string,
): Record<K, R> {
	return mapValues(groupCollect(ratePlanCharges, by), (arr) =>
		getSingleOrThrow(
			arr,
			(msg2) => new Error('duplicate keys: ' + msg + ', ' + msg2),
		),
	);
}
