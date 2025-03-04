import { z } from 'zod';

export const BigQueryRecordSchema = z.object({
	billingAccountId: z.string(),
	firstName: z.string(),
	nextPaymentDate: z
		.union([
			z.object({
				value: z.string(),
			}),
			z.string(),
		])
		.transform((val) => (typeof val === 'string' ? val : val.value)),
	oldPaymentAmount: z.number().optional(),
	paymentAmount: z.number().optional(),
	paymentCurrency: z.string(),
	paymentFrequency: z.string(),
	productName: z.string(),
	sfContactId: z.string(),
	zuoraSubName: z.string(),
	workEmail: z.string().nullable(),
	contactCountry: z.string().nullable(),
	sfBuyerContactMailingCountry: z.string().nullable(),
	sfBuyerContactOtherCountry: z.string().nullable(),
	sfRecipientContactMailingCountry: z.string().nullable(),
	sfRecipientContactOtherCountry: z.string().nullable(),
});
export type BigQueryRecord = z.infer<typeof BigQueryRecordSchema>;

export const BigQueryResultDataSchema = z.array(BigQueryRecordSchema);

export const BaseRecordForEmailSendSchema = BigQueryRecordSchema.extend({
	subStatus: z.string(),
	errorDetail: z.string().optional(),
}).strict();
export type BaseRecordForEmailSend = z.infer<
	typeof BaseRecordForEmailSendSchema
>;

export const EmailSendEligibilitySchema = z
	.object({
		isEligible: z.boolean(),
		ineligibilityReason: z.string(),
	})
	.strict();
export type EmailSendEligibility = z.infer<typeof EmailSendEligibilitySchema>;

export const EmailSendRequestSchema = z
	.object({
		To: z.object({
			Address: z.string(),
			ContactAttributes: z.object({
				SubscriberAttributes: z.object({
					EmailAddress: z.string(),
					payment_amount: z.string(),
					first_name: z.string(),
					next_payment_date: z.string(),
					payment_frequency: z.string(),
				}),
			}),
		}),
		DataExtensionName: z.string(),
		SfContactId: z.string(),
	})
	.strict();
export type EmailSendRequest = z.infer<typeof EmailSendRequestSchema>;

export const EmailSendAttemptSchema = z
	.object({
		request: EmailSendRequestSchema.optional(),
		response: z
			.object({
				status: z.string(),
				errorDetail: z.string().optional(),
			})
			.optional(),
	})
	.strict();
export type EmailSendAttempt = z.infer<typeof EmailSendAttemptSchema>;

export const DiscountProcessingAttemptSchema = z
	.object({
		record: BaseRecordForEmailSendSchema,
		emailSendEligibility: EmailSendEligibilitySchema,
		emailSendAttempt: EmailSendAttemptSchema,
	})
	.strict();
export type DiscountProcessingAttempt = z.infer<
	typeof DiscountProcessingAttemptSchema
>;
