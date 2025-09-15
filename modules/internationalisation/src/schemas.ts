import { z } from 'zod';
import { CurrencyValues } from '@modules/internationalisation/currency';
import { supportInternationalisationIds } from '@modules/internationalisation/supportInternationalisation';
import { isoCountries } from '@modules/internationalisation/country';

export const isoCurrencySchema = z.enum(CurrencyValues);
export const isoCountrySchema = z.enum(isoCountries);
export const supportInternationalisationSchema = z.enum(
	supportInternationalisationIds,
);
