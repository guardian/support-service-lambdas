export const sum = <T>(array: T[], fn: (item: T) => number): number => {
	return array.reduce((acc, item) => acc + fn(item), 0);
};
export const sumNumbers = (array: number[]): number => {
	return sum(array, (item) => item);
};
export const groupBy = <T>(
	array: T[],
	fn: (item: T) => string,
): Record<string, T[]> => {
	return array.reduce<Record<string, T[]>>((acc, item) => {
		const key = fn(item);
		const group = acc[key] ?? [];
		group.push(item);
		acc[key] = group;
		return acc;
	}, {});
};

export const groupMap = <T, R>(
	array: T[],
	group: (item: T) => string,
	map: (item: T) => R,
): Record<string, R[]> => {
	return Object.fromEntries(
		Object.entries(groupBy(array, group)).map(([key, values]) => [
			key,
			values.map(map),
		]),
	);
};

export const mapValues = <V, O>(
	obj: Record<string, V>,
	fn: (v: V) => O,
): Record<string, O> =>
	Object.fromEntries(
		Object.entries(obj).map(([key, value]) => [key, fn(value)]),
	);

export const partition = <T, U extends T>(
	arr: T[],
	fn: (t: T) => t is U,
): [U[], Exclude<T, U>[]] =>
	arr.reduce<[U[], Exclude<T, U>[]]>(
		(acc, val) => {
			if (fn(val)) acc[0].push(val);
			else acc[1].push(val as Exclude<T, U>);
			return acc;
		},
		[[], []],
	);

export const sortBy = <T>(array: T[], fn: (item: T) => string): T[] => {
	return array.sort((posGT, negGT) => {
		const posGTKey = fn(posGT);
		const negGTKey = fn(negGT);
		if (posGTKey > negGTKey) return 1;
		else if (posGTKey < negGTKey) return -1;
		else return 0;
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
export const distinct = <T>(array: T[]) => Array.from(new Set(array));
export const arrayToObject = <T>(array: Array<Record<string, T>>) => {
	return array.reduce((acc, val) => {
		return { ...acc, ...val };
	}, {});
};

export function flatten<T>(nested: T[][]): T[] {
	return nested.flatMap((a) => a);
}
