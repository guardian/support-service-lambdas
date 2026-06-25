import type { CaState} from '@modules/internationalisation/country';
import { caStateSchema } from '@modules/internationalisation/country';
import { isoCountrySchema } from '@modules/internationalisation/schemas';
import { productKeySchema } from '@modules/product-catalog/productCatalogSchema';
import { z } from 'zod';

export const taxRatesRequestSchema = z.object({
	productKey: productKeySchema,
	country: isoCountrySchema,
});
export type TaxRatesRequest = z.infer<typeof taxRatesRequestSchema>;

export const taxRatesResponseSchema = z.object(
	Object.fromEntries(
		caStateSchema.options.map((state) => [state, z.number()]),
	) as Record<CaState, z.ZodNumber>,
);

export type TaxRatesResponse = Record<CaState, number>
