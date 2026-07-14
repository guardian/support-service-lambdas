import type { CountryCode } from '@modules/internationalisation/country';

// The set of countries that we cannot make any sales to
export const restrictedCountries: Set<CountryCode> = new Set([
	'RU', // Russia
]);
