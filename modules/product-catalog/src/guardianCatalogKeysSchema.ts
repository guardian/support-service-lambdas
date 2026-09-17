import { z } from 'zod';
import { objectEntries, objectKeysNonEmpty } from '@modules/objectFunctions';
import type { GuardianCatalogKeys } from '@modules/product-catalog/productCatalog';
import { productCatalogSchema } from '@modules/product-catalog/productCatalogSchema';

// Derived from productCatalogSchema so the two can never drift. Zod cannot
// reconstruct the exact per-product pairing from runtime iteration, so the
// precise type is pinned via the statically-derived GuardianCatalogKeys.
const memberSchemas = objectEntries(productCatalogSchema.shape).map(
	([productKey, productSchema]) =>
		z.object({
			productKey: z.literal(productKey),
			productRatePlanKey: z.enum(
				objectKeysNonEmpty(
					productSchema.shape.ratePlans.shape as Record<string, unknown>,
				),
			),
		}),
);

export const guardianCatalogKeysSchema = z.union(
	memberSchemas as unknown as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]],
) as z.ZodType<GuardianCatalogKeys>;
