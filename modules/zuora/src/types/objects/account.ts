import { z } from 'zod';
import { zuoraResponseSchema } from '../httpResponse';
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
	currency: z.string(),
	creditBalance: z.number(),
});
export const billToContactSchema = z.object({
	firstName: z.string(),
	lastName: z.string(),
	workEmail: z.string(),
});

export const billingAndPaymentSchema = z.object({
	currency: z.string(),
	defaultPaymentMethodId: z.string(),
});

export const zuoraAccountSchema = z.intersection(
	zuoraResponseSchema,
	z.object({
		basicInfo: zuoraAccountBasicInfoSchema,
		billingAndPayment: billingAndPaymentSchema,
		billToContact: billToContactSchema,
		metrics: metricsSchema,
	}),
);
export type ZuoraAccount = z.infer<typeof zuoraAccountSchema>;

export const zuoraSubscriptionsFromAccountSchema = z.intersection(
	zuoraResponseSchema,
	z.object({
		subscriptions: z.array(zuoraSubscriptionSchema).optional(),
	}),
);

export type ZuoraSubscriptionsFromAccountResponse = z.infer<
	typeof zuoraSubscriptionsFromAccountSchema
>;
