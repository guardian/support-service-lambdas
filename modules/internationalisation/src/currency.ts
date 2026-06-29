import { isInList } from '@modules/arrayFunctions';
import z from 'zod';

export const currencyCodes = [
	'GBP',
	'EUR',
	'AUD',
	'USD',
	'CAD',
	'NZD',
] as const;

export type CurrencyCode = (typeof currencyCodes)[number];
export const currencyCodeSchema = z.enum(currencyCodes);

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

export const isSupportedCurrency = isInList(currencyCodes);

export const getCurrency = (currency: CurrencyCode): Currency =>
	currencies[currency];
