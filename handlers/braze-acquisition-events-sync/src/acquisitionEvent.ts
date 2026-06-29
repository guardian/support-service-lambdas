import type { EventBridgeEvent } from 'aws-lambda';
import { z } from 'zod';

export type Currency = string;

export const acquisitionProductValues = [
	'CONTRIBUTION',
	'RECURRING_CONTRIBUTION',
	'SUPPORTER_PLUS',
	'TIER_THREE',
	'DIGITAL_SUBSCRIPTION',
	'PRINT_SUBSCRIPTION',
	'APP_PREMIUM_TIER',
	'GUARDIAN_AD_LITE',
	'FEAST_APP',
] as const;

export type AcquisitionProduct = (typeof acquisitionProductValues)[number];

export const paymentFrequencyValues = [
	'ONE_OFF',
	'MONTHLY',
	'QUARTERLY',
	'SIX_MONTHLY',
	'ANNUALLY',
	'ANNUAL',
] as const;

export type PaymentFrequency = (typeof paymentFrequencyValues)[number];

export const acquisitionDataRowSchema = z.object({
	eventTimeStamp: z.string(),
	product: z.enum(acquisitionProductValues),
	printProduct: z.string().nullable().optional(),
	amount: z.number().nullable().optional(),
	currency: z.string(),
	paymentFrequency: z.enum(paymentFrequencyValues),
	identityId: z.string().nullable().optional(),
	promoCode: z.string().nullable().optional(),
});

export const acquisitionsEventSchema = z
	.object({
		detail: acquisitionDataRowSchema,
	})
	.passthrough();

export interface AcquisitionDataRow {
	eventTimeStamp: string;
	product: AcquisitionProduct;
	printProduct?: string | null;
	currency: Currency;
	paymentFrequency: PaymentFrequency;
	identityId?: string | null;
	promoCode?: string | null;
	amount?: number | null;
}

export type AcquisitionsEventBridgeEvent = EventBridgeEvent<
	'AcquisitionsEvent',
	AcquisitionDataRow
>;
