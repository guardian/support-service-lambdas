// these helper functions enable us to have auto complete on dependencies while
// keeping the data structures simple
export function separateDepRecords<K extends string>(
	libs: Record<K, string>,
): Record<K, Record<string, string>> {
	return (Object.keys(libs) as K[])
		.map(
			(lib) =>
				({ [lib]: { [lib]: libs[lib] } }) as Record<K, Record<string, string>>,
		)
		.reduce((a, b) => ({ ...a, ...b }));
}

export function withPrefix<T extends string, P extends string>(
	prefix: P,
	libs: readonly T[],
) {
	return libs.map((lib) => `${prefix}${lib}` as const);
}

export function withVersion<T extends string>(
	awsClientVersion: string,
	libs: readonly T[],
): Record<T, string> {
	return libs
		.map((lib) => ({ [lib]: awsClientVersion }) as Record<T, string>)
		.reduce((a, b) => ({ ...a, ...b }));
}
