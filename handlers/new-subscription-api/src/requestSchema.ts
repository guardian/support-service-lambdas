import { z } from 'zod';

const contactSchema = z.object({
	firstName: z.string(),
	lastName: z.string(),
	workEmail: z.string().email(),
	country: z.string(),
	state: z.string().nullish(),
	city: z.string().optional(),
	address1: z.string().optional(),
	address2: z.string().nullish(),
	postalCode: z.string().optional(),
});

const stripeGatewaySchema = z.enum([
	'Stripe PaymentIntents GNM Membership',
	'Stripe PaymentIntents GNM Membership AUS',
	'Stripe - Observer - Tortoise Media',
]);

const goCardlessGatewaySchema = z.enum([
	'GoCardless',
	'GoCardless - Observer - Tortoise Media',
]);

const payPalGatewaySchema = z.literal('PayPal Express');

const payPalCompletePaymentsGatewaySchema = z.literal(
	'PayPal Complete Payments',
);

export const paymentGatewaySchema = z.union([
	stripeGatewaySchema,
	goCardlessGatewaySchema,
	payPalGatewaySchema,
	payPalCompletePaymentsGatewaySchema,
]);

const creditCardPaymentMethodSchema = z.object({
	type: z.literal('CreditCardReferenceTransaction'),
	tokenId: z.string(),
	secondTokenId: z.string(),
	cardNumber: z.string(),
	cardType: z.string().optional(),
	expirationMonth: z.number(),
	expirationYear: z.number(),
});

const directDebitPaymentMethodSchema = z.object({
	type: z.literal('Bacs'),
	accountHolderInfo: z.object({
		accountHolderName: z.string(),
	}),
	accountNumber: z.string(),
	bankCode: z.string(),
});

const payPalPaymentMethodSchema = z.object({
	type: z.literal('PayPalNativeEC'),
	BAID: z.string(),
	email: z.string(),
});

export const paymentMethodSchema = z.discriminatedUnion('type', [
	creditCardPaymentMethodSchema,
	directDebitPaymentMethodSchema,
	payPalPaymentMethodSchema,
]);

export type ParsedPaymentMethod = z.infer<typeof paymentMethodSchema>;
export type ParsedPaymentGateway = z.infer<typeof paymentGatewaySchema>;

const currencySchema = z.enum(['GBP', 'EUR', 'AUD', 'USD', 'CAD', 'NZD']);

export const createSubscriptionRequestSchema = z.object({
	accountName: z.string(),
	createdRequestId: z
		.string()
		.uuid('createdRequestId must be a valid UUID to prevent duplicate orders'),
	salesforceAccountId: z.string(),
	salesforceContactId: z.string(),
	identityId: z.string(),
	currency: currencySchema,
	paymentGateway: paymentGatewaySchema,
	paymentMethod: paymentMethodSchema,
	billToContact: contactSchema,
	productPurchase: z.object({
		product: z.string(),
		ratePlan: z.string(),
		amount: z.number().optional(),
	}),
	promoCode: z.string().optional(),
});

export type CreateSubscriptionRequest = z.infer<
	typeof createSubscriptionRequestSchema
>;
