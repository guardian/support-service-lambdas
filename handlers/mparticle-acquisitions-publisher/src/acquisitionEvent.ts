import { z } from 'zod';

const nullableString = z.string().nullish();

const consentMetadataSchema = z.object({
	capturedAt: z.string(),
	consentManagerVersion: z.string(),
	gpcSignal: z.boolean().nullish(),
});

const tcfv2ConsentSnapshotSchema = z
	.object({
		gdprApplies: z.boolean().nullable(),
		consents: z.record(z.string(), z.boolean()),
		vendorConsents: z.record(z.string(), z.boolean()),
		eventStatus: z.string().optional(),
		addtlConsent: z.string().optional(),
		tcString: z.string().optional(),
	})
	.passthrough();

const usnatConsentSnapshotSchema = z
	.object({
		doNotSell: z.boolean(),
		signalStatus: z.string().optional(),
	})
	.passthrough();

const ausConsentSnapshotSchema = z
	.object({
		personalisedAdvertising: z.boolean(),
		signalStatus: z.string().optional(),
	})
	.passthrough();

const cmpConsentSnapshotSchema = z
	.discriminatedUnion('framework', [
		consentMetadataSchema
			.extend({
				framework: z.literal('tcfv2'),
				tcfv2: tcfv2ConsentSnapshotSchema,
			})
			.passthrough(),
		consentMetadataSchema
			.extend({
				framework: z.literal('usnat'),
				usnat: usnatConsentSnapshotSchema,
			})
			.passthrough(),
		consentMetadataSchema
			.extend({
				framework: z.literal('aus'),
				aus: ausConsentSnapshotSchema,
			})
			.passthrough(),
	])
	.nullish()
	.catch(null);

export const acquisitionProductSchema = z.object({
	eventTimeStamp: z.string().min(1),
	product: z.string().min(1),
	amount: z.number().finite().nullish(),
	country: z.string().min(1),
	currency: z.string().min(1),
	componentId: nullableString,
	componentType: nullableString,
	campaignCode: nullableString,
	source: nullableString,
	referrerUrl: nullableString,
	hostname: nullableString,
	userAgent: nullableString,
	ipAddress: nullableString,
	abTests: z.array(z.object({ name: z.string(), variant: z.string() })),
	paymentFrequency: z.string().min(1),
	paymentProvider: nullableString,
	printOptions: z
		.object({ product: z.string(), deliveryCountry: z.string() })
		.nullish(),
	browserId: nullableString,
	identityId: nullableString,
	pageViewId: nullableString,
	referrerPageViewId: nullableString,
	labels: z.array(z.string()),
	promoCode: nullableString,
	reusedExistingPaymentMethod: z.boolean(),
	readerType: z.string().min(1),
	acquisitionType: z.string().min(1),
	zuoraSubscriptionNumber: nullableString,
	contributionId: nullableString,
	paymentId: nullableString,
	queryParameters: z.array(
		z.object({
			name: z.string(),
			value: z.string(),
		}),
	),
	platform: nullableString,
	postalCode: nullableString,
	state: nullableString,
	email: nullableString,
	similarProductsConsent: z.boolean().nullish(),
	cmpConsentSnapshot: cmpConsentSnapshotSchema,
	paypalTransactionId: nullableString,
});

export type AcquisitionProduct = z.infer<typeof acquisitionProductSchema>;

export const acquisitionEventSchema = z
	.object({ detail: acquisitionProductSchema })
	.passthrough();

export type AcquisitionEvent = z.infer<typeof acquisitionEventSchema>;
