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
