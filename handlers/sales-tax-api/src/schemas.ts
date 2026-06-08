import { isoCountrySchema } from '@modules/internationalisation/schemas';
import { productKeySchema } from '@modules/product-catalog/productCatalogSchema';
import { z } from 'zod';

export const salesTaxRequestSchema = z.object({
	productKey: productKeySchema,
	country: isoCountrySchema,
	state: z.string(),
});
export type SalesTaxRequest = z.infer<typeof salesTaxRequestSchema>;

export const salesTaxResponseSchema = z.object({
	taxRate: z.number(),
});
export type SalesTaxResponse = z.infer<typeof salesTaxResponseSchema>;
