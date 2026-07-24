import { z } from 'zod';
import { countryCodes } from '@modules/internationalisation/country';
import { SupportRegionId } from '@modules/internationalisation/countryGroup';
import { currencyCodes } from '@modules/internationalisation/currency';

export const currencyCodeSchema = z.enum(currencyCodes);
export const countryCodeSchema = z.enum(countryCodes);
export const supportRegionSchema = z.nativeEnum(SupportRegionId);
