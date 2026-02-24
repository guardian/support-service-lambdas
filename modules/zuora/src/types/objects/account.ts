import { CurrencyValues } from '@modules/internationalisation/currency';
import { z } from 'zod';
import { zuoraSubscriptionSchema } from './subscription';

export const zuoraAccountBasicInfoSchema = z
	.object({
		id: z.string(),
		IdentityId__c: z.string(),
	})
	.transform((obj) => ({
		id: obj.id,
		identityId: obj.IdentityId__c,
	}));

export const metricsSchema = z.object({
	totalInvoiceBalance: z.number(),
	currency: z.enum(CurrencyValues),
	creditBalance: z.number(),
});
export const billToContactSchema = z.object({
	firstName: z.string(),
	lastName: z.string(),
	workEmail: z.string(),
});

const validPaymentGateways = [
	'GoCardless - Observer - Tortoise Media',
	'PayPal Complete Payments',
	'Stripe Bank Transfer - GNM Membership',
	'Stripe PaymentIntents GNM Membership AUS',
	'PayPal - Observer - Tortoise Media',
	'Stripe - Observer - Tortoise Media',
	'PayPal Express',
	'GoCardless',
	'Stripe PaymentIntents GNM Membership',
] as const;

export const billingAndPaymentSchema = z.object({
	currency: z.string(),
	defaultPaymentMethodId: z.string(),
	paymentGateway: z.enum(validPaymentGateways),
});

export const zuoraAccountSchema = z.object({
	basicInfo: zuoraAccountBasicInfoSchema,
	billingAndPayment: billingAndPaymentSchema,
	billToContact: billToContactSchema,
	metrics: metricsSchema,
});

export type ZuoraAccount = z.infer<typeof zuoraAccountSchema>;

export const zuoraSubscriptionsFromAccountSchema = z.object({
	subscriptions: z.array(zuoraSubscriptionSchema).optional(),
});

export type ZuoraSubscriptionsFromAccountResponse = z.infer<
	typeof zuoraSubscriptionsFromAccountSchema
>;
