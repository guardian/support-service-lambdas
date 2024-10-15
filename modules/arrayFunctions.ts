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

// TODO add tests
export const mapValues = <K extends keyof any, V, N>(
	records: Record<K, V>,
	fn: (item: V) => N,
): Record<K, N> => {
	return Object.fromEntries(
		Object.entries(records).map(([key, value]) => [key, fn(value as V)]),
	) as Record<K, N>;
};

export const groupMap = <T, N>(
	array: T[],
	groupFn: (item: T) => string,
	mapFn: (item: T) => N,
): Record<string, N[]> => {
	return mapValues(groupBy(array, groupFn), (groupedItems) =>
		groupedItems.map(mapFn),
	);
};

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
