import { z } from 'zod';
import { countryCodeSchema } from '@modules/internationalisation/schemas';
import { caStateCodes } from '@modules/internationalisation/state';
import { productKeySchema } from '@modules/product-catalog/productCatalogSchema';

export const taxRatesRequestSchema = z.object({
	productKey: productKeySchema,
	country: countryCodeSchema,
});
export type TaxRatesRequest = z.infer<typeof taxRatesRequestSchema>;

export const caStateSchema = z.enum(caStateCodes);
export const taxRatesResponseSchema = z.record(caStateSchema, z.number());
export type TaxRatesResponse = z.infer<typeof taxRatesResponseSchema>;
