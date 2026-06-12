import { z } from 'zod';

export const zuoraTaxCode = z.object({
	id: z.string(),
	taxEngineId: z.string(),
	active: z.boolean(),
	name: z.string(),
	description: z.string(),
});
export const zuoraTaxCodeSchema = z.object({
	taxCodes: z.array(zuoraTaxCode),
});
export type ZuoraTaxCode = z.infer<typeof zuoraTaxCode>;
export type ZuoraTaxCodes = z.infer<typeof zuoraTaxCodeSchema>;

export const zuoraTaxRate = z.object({
	id: z.string(),
	taxRatePeriodId: z.string(),
	country: z.string(),
	state: z.string(),
	county: z.string().nullable(),
	city: z.string().nullable(),
	postalCode: z.string().nullable(),
	taxRegion: z.string().nullable(),
	taxRate1: z.number(),
	taxRateType1: z.string().nullable(),
	taxName1: z.string().nullable(),
	taxJursdiction1: z.string().nullable(),
	taxLocationCode1: z.string().nullable(),
	taxRateDescription1: z.string().nullable(),
	taxRate2: z.number(),
	taxRateType2: z.string().nullable(),
	taxName2: z.string().nullable(),
	taxJursdiction2: z.string().nullable(),
	taxLocationCode2: z.string().nullable(),
	taxRateDescription2: z.string().nullable(),
	taxRate3: z.number(),
	taxRateType3: z.string().nullable(),
	taxName3: z.string().nullable(),
	taxJursdiction3: z.string().nullable(),
	taxLocationCode3: z.string().nullable(),
	taxRateDescription3: z.string().nullable(),
});
export const zuoraTaxRateSchema = z.object({
	taxRates: z.array(zuoraTaxRate),
});
export type ZuoraTaxRate = z.infer<typeof zuoraTaxRate>;
export type ZuoraTaxRates = z.infer<typeof zuoraTaxRateSchema>;
