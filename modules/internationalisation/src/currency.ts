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
	code: CurrencyCode;
	glyph: string;
	extendedGlyph: string;
	spokenCurrency: string;
};

const currencies: Record<CurrencyCode, Currency> = {
	GBP: {
		code: 'GBP',
		glyph: '£',
		extendedGlyph: '£',
		spokenCurrency: 'pound',
	},
	EUR: {
		code: 'EUR',
		glyph: '€',
		extendedGlyph: '€',
		spokenCurrency: 'euro',
	},
	AUD: {
		code: 'AUD',
		glyph: '$',
		extendedGlyph: 'AU$',
		spokenCurrency: 'dollar',
	},
	USD: {
		code: 'USD',
		glyph: '$',
		extendedGlyph: 'US$',
		spokenCurrency: 'dollar',
	},
	CAD: {
		code: 'CAD',
		glyph: '$',
		extendedGlyph: 'CA$',
		spokenCurrency: 'dollar',
	},
	NZD: {
		code: 'NZD',
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
