import { z } from 'zod';

export const zuoraTaxCodeSchema = z.object({
	id: z.string(),
	taxEngineId: z.string(),
	active: z.boolean(),
	name: z.string(),
	description: z.string(),
});
export const zuoraTaxCodesSchema = z
	.object({
		taxCodes: z.array(zuoraTaxCodeSchema),
	})
	.optional();
export type ZuoraTaxCode = z.infer<typeof zuoraTaxCodeSchema>;
export type ZuoraTaxCodes = z.infer<typeof zuoraTaxCodesSchema> | undefined;

export const zuoraTaxPeriodSchema = z.object({
	id: z.string(),
	startDate: z.string().nullable(),
	endDate: z.string().nullable(),
	taxCodeId: z.string(),
});
export const zuoraTaxPeriodsSchema = z
	.object({
		taxRatePeriods: z.array(zuoraTaxPeriodSchema),
	})
	.optional();
export type ZuoraTaxPeriod = z.infer<typeof zuoraTaxPeriodSchema>;
export type ZuoraTaxPeriods = z.infer<typeof zuoraTaxPeriodsSchema> | undefined;

export const zuoraTaxRateSchema = z.object({
	id: z.string(),
	taxRatePeriodId: z.string(),
	country: z.string(),
	state: z.string().nullable(),
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
export const zuoraTaxRatesSchema = z.object({
	taxRates: z.array(zuoraTaxRateSchema),
});
export type ZuoraTaxRate = z.infer<typeof zuoraTaxRateSchema>;
export type ZuoraTaxRates = z.infer<typeof zuoraTaxRatesSchema>;
