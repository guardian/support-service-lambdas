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

export function getPnpmCatalog<K extends string>(catalog: Record<K, string>) {
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
	// aws sdk v2 is not allowed
	if ((catalog as Record<string, string>)['aws-sdk']) {
		throw new Error('AWS SDK v2 is not allowed in the pnpm catalog');
	}

	return separateDepRecords(
		withVersion('catalog:', Object.keys(catalog) as K[]),
	);
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
