// these helper functions enable us to have auto complete on dependencies while
// keeping the data structures simple
export function separateDepRecords<K extends string>(
	libs: Record<K, string>,
): Record<K, Record<string, string>> {
	return recordKeys(libs)
		.map((lib: K) => {
			const depRecord = {
				[lib]: libs[lib],
			};
			return recordFromEntries([[lib, depRecord]]);
		})
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
		.map((lib) => recordFromEntries([[lib, awsClientVersion]]))
		.reduce((a, b) => ({ ...a, ...b }));
}

export function recordKeys<K extends string>(libs: Record<K, string>): K[] {
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- allowed in utility function - get back type lost by Object.keys
	return Object.keys(libs) as K[];
}

export function recordFromEntries<K extends string, V>(
	libs: Array<[K, V]>,
): Record<K, V> {
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- allowed in utility function - get back type lost by Object.keys
	return Object.fromEntries(libs) as Record<K, V>;
}
