import z from 'zod';
import { countryCodes } from '@modules/internationalisation/country';
import { currencyCodes } from '@modules/internationalisation/currency';
import {
	auStateCodes,
	caStateCodes,
	stateCodes,
	usStateCodes,
} from '@modules/internationalisation/state';
import { supportRegionIds } from '@modules/internationalisation/supportRegion';

export const countryCodeSchema = z.enum(countryCodes);

export const usStateCodeSchema = z.enum(usStateCodes);
export const usStateSchema = z.record(usStateCodeSchema, z.string());
export const caStateCodeSchema = z.enum(caStateCodes);
export const caStateSchema = z.record(caStateCodeSchema, z.string());
export const auStateCodeSchema = z.enum(auStateCodes);
export const auStateSchema = z.record(auStateCodeSchema, z.string());
export type UsState = z.infer<typeof usStateSchema>;
export type CaState = z.infer<typeof caStateSchema>;
export type AuState = z.infer<typeof auStateSchema>;

export const stateCodeSchema = z.enum(stateCodes);
export const stateOrProvinceSchema = z.union([
	usStateSchema,
	caStateSchema,
	auStateSchema,
]);
export const currencyCodeSchema = z.enum(currencyCodes);
export const supportRegionIdSchema = z.enum(supportRegionIds);
export const supportRegionSchema = z.object({
	name: z.string(),
	currency: currencyCodeSchema,
	countries: countryCodeSchema.array(),
	states: stateOrProvinceSchema.optional(),
});
export type SupportRegion = z.infer<typeof supportRegionSchema>;
