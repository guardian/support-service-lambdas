import type { EventBridgeEvent } from 'aws-lambda';
import { z } from 'zod';

export type AcquisitionProduct = string | Record<string, unknown>;
export type Country = string;
export type Currency = string;
export type PaymentFrequency = string;
export type PaymentProvider = string;
export type ReaderType = string;
export type AcquisitionType = string;

export interface AbTest {
	name: string;
	variant: string;
}

export type PrintOptions = Record<string, unknown>;

export interface QueryParameter {
	key: string;
	value: string;
}

export const abTestSchema = z.object({
	name: z.string(),
	variant: z.string(),
});

export const queryParameterSchema = z.object({
	key: z.string(),
	value: z.string(),
});

export const acquisitionDataRowSchema = z.object({
	eventTimeStamp: z.string(),
	product: z.union([z.string(), z.record(z.string(), z.unknown())]),
	amount: z.number().nullable().optional(),
	country: z.string(),
	currency: z.string(),
	componentId: z.string().nullable().optional(),
	componentType: z.string().nullable().optional(),
	campaignCode: z.string().nullable().optional(),
	source: z.string().nullable().optional(),
	referrerUrl: z.string().nullable().optional(),
	abTests: z.array(abTestSchema),
	paymentFrequency: z.string(),
	paymentProvider: z.string().nullable().optional(),
	printOptions: z.record(z.string(), z.unknown()).nullable().optional(),
	browserId: z.string().nullable().optional(),
	identityId: z.string().nullable().optional(),
	pageViewId: z.string().nullable().optional(),
	referrerPageViewId: z.string().nullable().optional(),
	labels: z.array(z.string()),
	promoCode: z.string().nullable().optional(),
	reusedExistingPaymentMethod: z.boolean(),
	readerType: z.string(),
	acquisitionType: z.string(),
	zuoraSubscriptionNumber: z.string().nullable().optional(),
	contributionId: z.string().nullable().optional(),
	paymentId: z.string().nullable().optional(),
	queryParameters: z.array(queryParameterSchema),
	platform: z.string().nullable().optional(),
	postalCode: z.string().nullable().optional(),
	state: z.string().nullable().optional(),
	email: z.string().nullable().optional(),
	similarProductsConsent: z.boolean().nullable().optional(),
	paypalTransactionId: z.string().nullable().optional(),
});

export const acquisitionsEventSchema = z
	.object({
		detail: acquisitionDataRowSchema,
	})
	.passthrough();

export interface AcquisitionDataRow {
	eventTimeStamp: string;
	product: AcquisitionProduct;
	amount?: number | null;
	country: Country;
	currency: Currency;
	componentId?: string | null;
	componentType?: string | null;
	campaignCode?: string | null;
	source?: string | null;
	referrerUrl?: string | null;
	abTests: AbTest[];
	paymentFrequency: PaymentFrequency;
	paymentProvider?: PaymentProvider | null;
	printOptions?: PrintOptions | null;
	browserId?: string | null;
	identityId?: string | null;
	pageViewId?: string | null;
	referrerPageViewId?: string | null;
	labels: string[];
	promoCode?: string | null;
	reusedExistingPaymentMethod: boolean;
	readerType: ReaderType;
	acquisitionType: AcquisitionType;
	zuoraSubscriptionNumber?: string | null;
	contributionId?: string | null;
	paymentId?: string | null;
	queryParameters: QueryParameter[];
	platform?: string | null;
	postalCode?: string | null;
	state?: string | null;
	email?: string | null;
	similarProductsConsent?: boolean | null;
	paypalTransactionId?: string | null;
}

export type AcquisitionsEventBridgeEvent = EventBridgeEvent<
	'AcquisitionsEvent',
	AcquisitionDataRow
>;
