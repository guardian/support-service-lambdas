import { isoCountries } from '@modules/internationalisation/country';
import { SupportRegionId } from '@modules/internationalisation/countryGroup';
import { z } from 'zod';

export const isoCountrySchema = z.enum(isoCountries);
export const supportRegionSchema = z.nativeEnum(SupportRegionId);
