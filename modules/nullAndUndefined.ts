export const isNotNull = <T>(value: T): value is NonNullable<T> => !!value;
export const getIfDefined = <T>(
	value: T | undefined | null,
	errorMessage: string,
): T => {
	if (value === undefined || value === null) {
		throw new ReferenceError(errorMessage);
	}
	return value;
};

export function isNonEmpty<T>(arr: T[]): arr is [T, ...T[]] {
	// This check ensures that the array has at least one element and narrows the type accordingly
	// this way, TypeScript knows that arr[0] is of type T and not undefined
	return arr.length > 0;
}
