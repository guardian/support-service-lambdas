import { isInList } from '@modules/arrayFunctions';

export const CurrencyValues = [
	'GBP',
	'EUR',
	'AUD',
	'USD',
	'CAD',
	'NZD',
] as const;

export type IsoCurrency = (typeof CurrencyValues)[number];

export type CurrencyInfo = {
	glyph: string;
	extendedGlyph: string;
	spokenCurrency: string;
};

const currencies: Record<IsoCurrency, CurrencyInfo> = {
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

export const isSupportedCurrency = isInList(CurrencyValues);

export const getCurrencyInfo = (currency: IsoCurrency): CurrencyInfo =>
	currencies[currency];
