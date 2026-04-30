import { isoCurrencySchema } from '@modules/internationalisation/schemas';
import { productPurchaseSchema } from '@modules/product-catalog/productPurchaseSchema';
import { appliedPromotionSchema } from '@modules/promotions/v2/schema';
import { existingPaymentMethodInputSchema } from '@modules/zuora/createSubscription/createSubscriptionWithExistingPaymentMethod';
import { giftRecipientSchema } from '@modules/zuora/createSubscription/giftRecipient';
import { paymentGatewaySchema } from '@modules/zuora/orders/paymentGateways';
import { z } from 'zod';

export const contactSchema = z.object({
	firstName: z.string(),
	lastName: z.string(),
	workEmail: z.string(),
	country: z.string(),
	state: z.string().nullish(),
	city: z.string().optional(),
	address1: z.string().optional(),
	address2: z.string().nullish(),
	postalCode: z.string().optional(),
});

export const createSubscriptionRequestSchema = z.object({
	accountName: z.string(),
	createdRequestId: z
		.string()
		.uuid('createdRequestId must be a valid UUID to prevent duplicate orders'),
	salesforceAccountId: z.string(),
	salesforceContactId: z.string(),
	identityId: z.string(),
	currency: isoCurrencySchema,
	paymentGateway: paymentGatewaySchema,
	existingPaymentMethod: existingPaymentMethodInputSchema,
	billToContact: contactSchema,
	productPurchase: productPurchaseSchema,
	giftRecipient: giftRecipientSchema.optional(),
	appliedPromotion: appliedPromotionSchema.optional(),
	runBilling: z.boolean().optional(),
	collectPayment: z.boolean().optional(),
	acquisitionCase: z.string(),
	acquisitionSource: z.string(),
	createdByCSR: z.string(),
});

export type CreateSubscriptionRequest = z.infer<
	typeof createSubscriptionRequestSchema
>;
