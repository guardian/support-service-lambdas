import seedsDirConfig from '../../../data/seeds/_generated_dirIndex';

function isSeedName(value: string): value is keyof typeof seedsDirConfig {
	return value in seedsDirConfig;
}

export function getSeedEntryOrThrow(seedName: string) {
	if (!isSeedName(seedName)) {
		const available = Object.keys(seedsDirConfig).join(', ');
		throw new Error(
			`Unknown seed: '${seedName}'. Available seeds: ${available}`,
		);
	}
	return seedsDirConfig[seedName];
}
