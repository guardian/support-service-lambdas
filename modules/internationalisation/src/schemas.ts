import { z } from 'zod';
import { isoCountries } from '@modules/internationalisation/country';
import { CurrencyValues } from '@modules/internationalisation/currency';

export const isoCurrencySchema = z.enum(CurrencyValues);
export const isoCountrySchema = z.enum(isoCountries);
