import { z } from 'zod';
import { countryCodes } from '@modules/internationalisation/country';
import { currencyCodes } from '@modules/internationalisation/currency';
import { supportRegionIds } from '@modules/internationalisation/supportRegion';

export const currencyCodeSchema = z.enum(currencyCodes);
export const countryCodeSchema = z.enum(countryCodes);
export const supportRegionSchema = z.enum(supportRegionIds);
