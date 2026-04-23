import { isoCurrencySchema } from '@modules/internationalisation/schemas';
import {
	deliveryContactSchema,
	productPurchaseSchema,
} from '@modules/product-catalog/productPurchaseSchema';
import { appliedPromotionSchema } from '@modules/promotions/v2/schema';
import { giftRecipientSchema } from '@modules/zuora/createSubscription/giftRecipient';
import { paymentGatewaySchema } from '@modules/zuora/orders/paymentGateways';
import { z } from 'zod';

const existingPaymentMethodSchema = z.object({
	id: z.string(),
	requiresCloning: z.boolean(),
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
	existingPaymentMethod: existingPaymentMethodSchema,
	billToContact: deliveryContactSchema,
	productPurchase: productPurchaseSchema,
	giftRecipient: giftRecipientSchema.optional(),
	appliedPromotion: appliedPromotionSchema.optional(),
	runBilling: z.boolean().optional(),
	collectPayment: z.boolean().optional(),
	acquisitionCase: z.string().optional(),
	acquisitionSource: z.string().optional(),
	createdByCSR: z.string().optional(),
	promoCode: z.string().optional(),
});

export type CreateSubscriptionRequest = z.infer<
	typeof createSubscriptionRequestSchema
>;
