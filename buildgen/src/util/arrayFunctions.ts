export const filterSingle = <T>(
	items: T[],
	predicate: (item: T) => boolean,
	errorMessage: string,
): T[] => {
	const filtered = items.filter(predicate);
	if (filtered.length !== 1) {
		throw new Error(errorMessage);
	}
	return filtered;
};
