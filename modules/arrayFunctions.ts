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

export const getSingleOrThrow = <T>(
	array: T[],
	error: (msg: string) => Error,
	filter?: (element: T) => boolean,
): T => {
	const matchingElements = filter ? array.filter(filter) : array;
	if (matchingElements.length > 1) {
		throw error('Array had more than one matching element');
	}
	if (matchingElements.length < 1) {
		throw error('Array had no matching elements');
	}
	if (!matchingElements[0]) {
		throw error('Matching element was null or undefined');
	}
	return matchingElements[0];
};

export const findDuplicates = <T>(array: T[]) =>
	array.filter((item, index) => array.indexOf(item) !== index);
export const distinct = <T>(array: T[]) => Array.from(new Set(array));
export const arrayToObject = <T>(array: Array<Record<string, T>>) => {
	return array.reduce((acc, val) => {
		return { ...acc, ...val };
	}, {});
};
