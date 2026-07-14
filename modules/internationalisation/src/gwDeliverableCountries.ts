import { contributionsOnlyCountriesSet } from '@modules/internationalisation/contributionsOnlyCountries';
import type { CountryCode } from '@modules/internationalisation/country';
import { countries } from '@modules/internationalisation/country';
import { restrictedCountries } from '@modules/internationalisation/restrictedCountries';
import { objectEntries, objectFromEntries } from '@modules/objectFunctions';

export const gwDeliverableCountries: Partial<Record<CountryCode, string>> =
	objectFromEntries(
		objectEntries(countries).filter(
			([countryCode]) =>
				!restrictedCountries.has(countryCode) &&
				!contributionsOnlyCountriesSet.has(countryCode),
		),
	);
