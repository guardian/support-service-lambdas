import { z } from 'zod';

/**
 * Branded identifiers for Zuora's `subscriptionNumber`/`orderNumber` fields.
 *
 * Not all subscription/order numbers start with a fixed prefix (e.g. `A-S`/`O-`),
 * so the only constraint enforced is "alphanumeric, optionally with hyphens, no
 * whitespace or other special characters" - unlike `zuoraCatalogSchema.ts`'s
 * `zuoraIdSchema` (fixed-format 32-char lowercase hex), which this otherwise
 * follows the same factory pattern as.
 */
const numberRegex = /^[A-Za-z0-9-]+$/;

export type SubscriptionNumber = string & {
	readonly __brand: 'SubscriptionNumber';
};
export type OrderNumber = string & { readonly __brand: 'OrderNumber' };

const zuoraNumberSchema = <T extends string & { readonly __brand: string }>() =>
	z
		.string()
		.regex(numberRegex, 'must be alphanumeric, optionally with hyphens')
		// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- need to refine during deserialisation
		.transform((val: string) => val as T);

export const subscriptionNumberSchema = zuoraNumberSchema<SubscriptionNumber>();
export const orderNumberSchema = zuoraNumberSchema<OrderNumber>();
