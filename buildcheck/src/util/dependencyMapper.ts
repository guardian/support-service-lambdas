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

// the code won't type check if a disallowed library is present
type DisallowedLibs = readonly ['aws-sdk'];

const DISALLOWED_LIBRARY_IN_PNPM_CATALOG = Symbol('Error');
type DisallowedLibsType = {
	[Key in DisallowedLibs[number]]?: unknown;
};

export function getPnpmCatalog<K extends string>(
	catalog: Record<K, string> extends DisallowedLibsType
		? Record<K, string> & {
				// the following line is the compiler error reported when you try to add aws-sdk v2
				[DISALLOWED_LIBRARY_IN_PNPM_CATALOG]: `${keyof DisallowedLibsType & keyof Record<K, string>}`;
			}
		: Record<K, string>,
) {
	return separateDepRecords(
		withVersion('catalog:', catalogDependencyNames(catalog)),
	);
}

export function catalogDependencyNames<K extends string>(
	catalog: Record<K, string>,
): K[] {
	// check that all the aws sdk v3 versions are identical
	const awsVersions = new Set(
		Object.entries(catalog)
			.filter(([dep]) => dep.startsWith('@aws-sdk/'))
			.map(([, version]) => version),
	);
	if (awsVersions.size !== 1) {
		throw new Error(
			'mismatched AWS versions in pnpm catalog: ' +
				[...awsVersions].sort().join(', '),
		);
	}

	return Object.keys(catalog) as K[];
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
