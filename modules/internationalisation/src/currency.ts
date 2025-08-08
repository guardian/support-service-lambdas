export const CurrencyValues = [
	'GBP',
	'EUR',
	'AUD',
	'USD',
	'CAD',
	'NZD',
] as const;
export type IsoCurrency = (typeof CurrencyValues)[number];

export const isSupportedCurrency = (
	maybeCurrency: string,
): maybeCurrency is IsoCurrency => {
	return (CurrencyValues as readonly string[]).includes(maybeCurrency);
};

const currencyToGlyphMapping: { [C in IsoCurrency]: string } = {
	GBP: '£',
	EUR: '€',
	AUD: 'AU$',
	USD: 'US$',
	CAD: 'CA$',
	NZD: 'NZ$',
};

export const getCurrencyGlyph = (currency: IsoCurrency) =>
	currencyToGlyphMapping[currency];
