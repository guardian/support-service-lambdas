import { z } from 'zod';
import type { AnyPaymentMethod } from '@modules/zuora/orders/paymentMethods';

//Gateway names need to match to those set in Zuora
//See: https://apisandbox.zuora.com/apps/NewGatewaySetting.do?method=list
export const stripePaymentGatewaySchema = z.enum([
	'Stripe PaymentIntents GNM Membership',
	'Stripe PaymentIntents GNM Membership AUS',
	'Stripe - Observer - Tortoise Media',
]);
export type StripePaymentGateway = z.infer<typeof stripePaymentGatewaySchema>;

export const payPalPaymentGatewaySchema = z.enum(['PayPal Express']);
export type PayPalPaymentGateway = z.infer<typeof payPalPaymentGatewaySchema>;

export const payPalCompletePaymentsPaymentGatewaySchema = z.enum([
	'PayPal Complete Payments',
]);
export type PayPalCompletePaymentsPaymentGateway = z.infer<
	typeof payPalCompletePaymentsPaymentGatewaySchema
>;

export const goCardlessPaymentGatewaySchema = z.enum([
	'GoCardless',
	'GoCardless - Observer - Tortoise Media',
]);
export type GoCardlessPaymentGateway = z.infer<
	typeof goCardlessPaymentGatewaySchema
>;

type PaymentGatewayMap = {
	CreditCardReferenceTransaction: StripePaymentGateway;
	Bacs: GoCardlessPaymentGateway;
	PayPalNativeEC: PayPalPaymentGateway;
	PayPalCP: PayPalCompletePaymentsPaymentGateway;
	ExistingPaymentMethod: GoCardlessPaymentGateway | StripePaymentGateway;
};

export const paymentGatewaySchema = z.union([
	stripePaymentGatewaySchema,
	goCardlessPaymentGatewaySchema,
	payPalPaymentGatewaySchema,
	payPalCompletePaymentsPaymentGatewaySchema,
]);

export type PaymentGateway<T extends AnyPaymentMethod> =
	T['type'] extends keyof PaymentGatewayMap
		? PaymentGatewayMap[T['type']]
		: never;
