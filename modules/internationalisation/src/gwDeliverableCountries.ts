import { objectEntries, objectFromEntries } from '@modules/objectFunctions';
import type { IsoCountry } from '@modules/internationalisation/country';
import { gwCountries } from '@modules/internationalisation/gwCountries';

const gwNonDeliverableCountries: Set<IsoCountry> = new Set([
	'AF', // Afghanistan
	'KI', // Kiribati
	'LY', // Libya
	'MD', // Moldova
	'NR', // Nauru
	'SD', // Sudan
	'SS', // South Sudan
	'SO', // Somalia
	'SY', // Syria
	'UA', // Ukraine
	'YE', // Yemen
]);

export const gwDeliverableCountries: Partial<Record<IsoCountry, string>> =
	objectFromEntries(
		objectEntries(gwCountries).filter(
			([countryCode]) => !gwNonDeliverableCountries.has(countryCode),
		),
	);
