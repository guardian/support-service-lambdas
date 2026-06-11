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
export const taxRatesRequestSchema = z.object({
	productKey: productKeySchema,
	country: isoCountrySchema,
});

export type TaxRatesRequest = z.infer<typeof taxRatesRequestSchema>;
export const taxRatesResponseSchema = z.object({
	AB: z.number(),
	BC: z.number(),
	MB: z.number(),
	NB: z.number(),
	NL: z.number(),
	NT: z.number(),
	NS: z.number(),
	NU: z.number(),
	ON: z.number(),
	PE: z.number(),
	QC: z.number(),
	SK: z.number(),
	YT: z.number(),
});
export type TaxRatesResponse = z.infer<typeof taxRatesResponseSchema>;
