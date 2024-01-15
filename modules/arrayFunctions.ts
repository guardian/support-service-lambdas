export const sum = <T>(array: T[], fn: (item: T) => number): number => {
	return array.reduce((acc, item) => acc + fn(item), 0);
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
	filter: (element: T) => boolean,
): T => {
	const matchingElements = array.filter(filter);
	if (matchingElements.length > 1) {
		throw new Error('Array had more than one matching element');
	}
	if (matchingElements.length < 1) {
		throw new Error('Array had no matching elements');
	}
	if (!matchingElements[0]) {
		throw new ReferenceError('Matching element was null or undefined :-s');
	}
	return matchingElements[0];
};