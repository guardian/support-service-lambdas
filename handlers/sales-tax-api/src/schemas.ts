import { caStateCodes } from '@modules/internationalisation/country';
import { isoCountrySchema } from '@modules/internationalisation/schemas';
import { productKeySchema } from '@modules/product-catalog/productCatalogSchema';
import { z } from 'zod';

export const taxRatesRequestSchema = z.object({
	productKey: productKeySchema,
	country: isoCountrySchema,
});
export type TaxRatesRequest = z.infer<typeof taxRatesRequestSchema>;

export const caStateSchema = z.enum(caStateCodes);
export const taxRatesResponseSchema = z.record(caStateSchema, z.number());
export type TaxRatesResponse = z.infer<typeof taxRatesResponseSchema>;
