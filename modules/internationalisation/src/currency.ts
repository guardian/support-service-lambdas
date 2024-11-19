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

export const getCurrencyGlyph = (currency: Currency) => {
	switch (currency) {
		case 'GBP':
			return '£';
		case 'EUR':
			return '€';
		case 'AUD':
		case 'CAD':
		case 'NZD':
		case 'USD':
			return '$';
	}
	throw new Error(`Unsupported currency ${currency}`);
};
