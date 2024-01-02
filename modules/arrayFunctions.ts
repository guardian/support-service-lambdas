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
