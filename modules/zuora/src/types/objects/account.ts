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

export type ZuoraAccountBasicInfo = z.infer<typeof zuoraAccountBasicInfoSchema>;

export const zuoraSubscriptionsFromAccountSchema = z.object({
	subscriptions: z.array(zuoraSubscriptionSchema).optional(),
});

export type ZuoraSubscriptionsFromAccountResponse = z.infer<
	typeof zuoraSubscriptionsFromAccountSchema
>;

// Schemas for capturing full account data for cloning

export const cloneContactSchema = z
	.object({
		firstName: z.string(),
		lastName: z.string(),
		workEmail: z.string().nullish(),
		address1: z.string().nullish(),
		address2: z.string().nullish(),
		city: z.string().nullish(),
		country: z.string().nullish(),
		county: z.string().nullish(),
		fax: z.string().nullish(),
		homePhone: z.string().nullish(),
		mobilePhone: z.string().nullish(),
		nickname: z.string().nullish(),
		otherPhone: z.string().nullish(),
		otherPhoneType: z.string().nullish(),
		personalEmail: z.string().nullish(),
		workPhone: z.string().nullish(),
		zipCode: z.string().nullish(),
		state: z.string().nullish(),
		taxRegion: z.string().nullish(),
	})
	.passthrough();

export type CloneContact = z.infer<typeof cloneContactSchema>;

export const cloneBasicInfoSchema = z
	.object({
		id: z.string(),
		name: z.string(),
		accountNumber: z.string(),
		notes: z.string().nullish(),
		status: z.string(),
		crmId: z.string().nullish(),
		batch: z.string().nullish(),
		salesRep: z.string().nullish(),
	})
	.passthrough();

export type CloneBasicInfo = z.infer<typeof cloneBasicInfoSchema>;

export const cloneBillingAndPaymentSchema = z.object({
	billCycleDay: z.number(),
	currency: z.string(),
	paymentTerm: z.string().nullish(),
	paymentGateway: z.string().nullable(),
	defaultPaymentMethodId: z.string(),
	invoiceDeliveryPrefsEmail: z.boolean().nullish(),
	invoiceDeliveryPrefsPrint: z.boolean().nullish(),
	autoPay: z.boolean().nullish(),
});

export type CloneBillingAndPayment = z.infer<
	typeof cloneBillingAndPaymentSchema
>;

export const cloneAccountSchema = z.object({
	basicInfo: cloneBasicInfoSchema,
	billingAndPayment: cloneBillingAndPaymentSchema,
	billToContact: cloneContactSchema,
	soldToContact: cloneContactSchema.optional(),
});

export type CloneAccountData = z.infer<typeof cloneAccountSchema>;

export const createAccountResponseSchema = z.object({
	accountId: z.string(),
	accountNumber: z.string(),
});

export type CreateAccountResponse = z.infer<typeof createAccountResponseSchema>;
