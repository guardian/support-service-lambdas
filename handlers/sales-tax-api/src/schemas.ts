import { isoCountrySchema } from '@modules/internationalisation/country';
import { caStateCodeSchema } from '@modules/internationalisation/states';
import { productKeySchema } from '@modules/product-catalog/productCatalogSchema';
import { z } from 'zod';

export const taxRatesRequestSchema = z.object({
	productKey: productKeySchema,
	country: isoCountrySchema,
});
export type TaxRatesRequest = z.infer<typeof taxRatesRequestSchema>;

export const taxRatesResponseSchema = z.record(caStateCodeSchema, z.number());
export type TaxRatesResponse = z.infer<typeof taxRatesResponseSchema>;
