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

/**
 * Returns the value if it is defined and satisfies the predicate; otherwise, throws a ReferenceError with the provided error message.
 * @param value
 * @param isValid
 * @param errorMessage
 *
 * example usage:
 * const stage: Stage = getIfDefinedAndValid(
 * 		process.argv[2],
 * 		(value): value is Stage => value === 'PROD' || value === 'CODE',
 * 		'Stage argument missing',
 * 	);
 */
export const getIfDefinedAndValid = <T>(
	value: unknown,
	isValid: (value: unknown) => value is T,
	errorMessage: string,
): T => {
	if (!getIfDefined(value, errorMessage) || !isValid(value)) {
		throw new ReferenceError(errorMessage);
	}
	return value;
};

export function isNonEmpty<T>(arr: T[]): arr is [T, ...T[]] {
	// This check ensures that the array has at least one element and narrows the type accordingly
	// this way, TypeScript knows that arr[0] is of type T and not undefined
	return arr.length > 0;
}

export function getNonEmptyOrThrow<T>(
	array: T[],
	errorMessage: string,
): [T, ...T[]] {
	if (!isNonEmpty(array)) {
		throw new Error(errorMessage);
	}
	return [array[0], ...array.slice(1)];
}

export const mapOption = <T, O>(
	value: T | undefined,
	fn: (value: T) => O,
): O | undefined => {
	if (value === undefined) {
		return undefined;
	}
	return fn(value);
};
