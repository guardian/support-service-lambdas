import { z } from 'zod';
import { isoCountries } from '@modules/internationalisation/country';
import { SupportRegionId } from '@modules/internationalisation/countryGroup';
import { CurrencyValues } from '@modules/internationalisation/currency';

export const isoCurrencySchema = z.enum(CurrencyValues);
export const isoCountrySchema = z.enum(isoCountries);
export const supportRegionSchema = z.nativeEnum(SupportRegionId);
