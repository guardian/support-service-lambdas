export const isNotNull = <T>(value: T): value is NonNullable<T> => !!value;
export const checkDefined = <T>(
	value: T | undefined | null,
	errorMessage: string,
): T => {
	if (!value) {
		throw new ReferenceError(errorMessage);
	}
	return value;
};
