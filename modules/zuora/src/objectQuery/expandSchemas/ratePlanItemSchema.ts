import {
	productIdSchema,
	productRatePlanIdSchema,
} from '@modules/zuora-catalog/zuoraCatalogSchema';
import z from 'zod';
import { ratePlanChargeItemSchema } from '@modules/zuora/objectQuery/expandSchemas/ratePlanChargeItemSchema';

export const ratePlanItemSchema = z.object({
	/** The unique identifier of the rate plan. */
	id: z.string(),
	/** The unique identifier of the user who created the rate plan. */
	createdById: z.string(),
	/** The date and time when the rate plan was created. */
	createdDate: z.coerce.date(),
	/** The unique identifier of the user who last updated the rate plan. */
	updatedById: z.string(),
	/** The date and time when the rate plan was last updated. */
	updatedDate: z.coerce.date(),
	/** The unique identifier of the product associated with the rate plan. */
	productId: productIdSchema,
	/** The unique identifier of the amendment made to the subscription. */
	amendmentId: z.string().nullable(),
	/** The type of amendment associated with the rate plan. */
	amendmentType: z
		.enum(['NewProduct', 'RemoveProduct', 'UpdateProduct'])
		.nullable(),
	/** The name of the rate plan. */
	name: z.string(),
	/** The unique identifier of the product rate plan that the rate plan is based on. */
	productRatePlanId: productRatePlanIdSchema,
	/** The unique identifier of the subscription associated with the rate plan. */
	subscriptionId: z.string(),
	/** The unique identifier of the account that owns the subscription. */
	subscriptionOwnerId: z.string(),
	/** The unique identifier of the account that will pay the invoice. */
	invoiceOwnerId: z.string(),
	/** The original ID of the subscription rate plan in the version-1 subscription. */
	originalRatePlanId: z.string(),
	/** The number of the rate plan in the subscription. */
	subscriptionRatePlanNumber: z.string(),
	/** Indicates whether the rate plan has been reverted. */
	reverted: z.boolean(),
});

export const ratePlanWithChargesSchema = ratePlanItemSchema.extend({
	ratePlanCharges: z.array(ratePlanChargeItemSchema),
});
