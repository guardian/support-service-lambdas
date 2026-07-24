export const currencyCodes = [
	'GBP',
	'EUR',
	'AUD',
	'USD',
	'CAD',
	'NZD',
] as const;

export type CurrencyCode = (typeof currencyCodes)[number];

export type Currency = {
	glyph: string;
	extendedGlyph: string;
	spokenCurrency: string;
};

const currencies: Record<CurrencyCode, Currency> = {
	GBP: {
		glyph: '£',
		extendedGlyph: '£',
		spokenCurrency: 'pound',
	},
	EUR: {
		glyph: '€',
		extendedGlyph: '€',
		spokenCurrency: 'euro',
	},
	AUD: {
		glyph: '$',
		extendedGlyph: 'AU$',
		spokenCurrency: 'dollar',
	},
	USD: {
		glyph: '$',
		extendedGlyph: 'US$',
		spokenCurrency: 'dollar',
	},
	CAD: {
		glyph: '$',
		extendedGlyph: 'CA$',
		spokenCurrency: 'dollar',
	},
	NZD: {
		glyph: '$',
		extendedGlyph: 'NZ$',
		spokenCurrency: 'dollar',
	},
};

const currencySet: Set<string> = new Set(currencyCodes);

export function isSupportedCurrency(
	maybeCurrency: string,
): maybeCurrency is CurrencyCode {
	return currencySet.has(maybeCurrency);
}

export function getCurrencyByCode(currencyCode: CurrencyCode): Currency {
	return currencies[currencyCode];
}
