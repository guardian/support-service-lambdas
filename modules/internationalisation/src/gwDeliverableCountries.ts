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
	Object.fromEntries(
		(Object.entries(gwCountries) as Array<[IsoCountry, string]>).filter(
			([countryCode]) => !gwNonDeliverableCountries.has(countryCode),
		),
	);
