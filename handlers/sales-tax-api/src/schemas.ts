import { isoCountrySchema } from '@modules/internationalisation/country';
import { caIsoStateSchema } from '@modules/internationalisation/state';
import { productKeySchema } from '@modules/product-catalog/productCatalogSchema';
import { z } from 'zod';

export const taxRatesRequestSchema = z.object({
	productKey: productKeySchema,
	country: isoCountrySchema,
});
export type TaxRatesRequest = z.infer<typeof taxRatesRequestSchema>;

export const taxRatesResponseSchema = z.record(caIsoStateSchema, z.number());
export type TaxRatesResponse = z.infer<typeof taxRatesResponseSchema>;
