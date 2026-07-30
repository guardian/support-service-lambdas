import { countryCodes } from '../src/country';
import { supportRegions } from '../src/supportRegion';

describe('support regions', () => {
	test('each country code belongs to only one support region', () => {
		const regionByCountry = new Map<string, string>();
		const duplicates: string[] = [];

		for (const [regionId, region] of Object.entries(supportRegions)) {
			for (const country of region.countries) {
				const existingRegion = regionByCountry.get(country);
				if (existingRegion) {
					duplicates.push(
						`${country} is in both '${existingRegion}' and '${regionId}'`,
					);
				} else {
					regionByCountry.set(country, regionId);
				}
			}
		}

		expect(duplicates).toEqual([]);
	});

	test('every country code belongs to a support region', () => {
		const assignedCountries = new Set(
			Object.values(supportRegions).flatMap((region) => region.countries),
		);

		const missing = countryCodes.filter(
			(country) => !assignedCountries.has(country),
		);

		expect(missing).toEqual([]);
	});
});
