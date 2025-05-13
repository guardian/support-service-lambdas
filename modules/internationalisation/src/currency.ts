export const CurrencyValues = [
	'GBP',
	'EUR',
	'AUD',
	'USD',
	'CAD',
	'NZD',
] as const;
export type Currency = (typeof CurrencyValues)[number];

export const isSupportedCurrency = (
	maybeCurrency: string,
): maybeCurrency is Currency => {
	return (CurrencyValues as readonly string[]).includes(maybeCurrency);
};

const currencyToGlyphMapping: { [C in Currency]: string } = {
	GBP: '£',
	EUR: '€',
	AUD: 'AU$',
	USD: 'US$',
	CAD: 'CA$',
	NZD: 'NZ$',
};

export const getCurrencyGlyph = (currency: Currency) =>
	currencyToGlyphMapping[currency];
