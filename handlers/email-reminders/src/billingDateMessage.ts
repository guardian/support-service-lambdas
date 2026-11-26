import { z } from 'zod';

export const isoDateSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, 'expected an ISO date (YYYY-MM-DD)');

// Message passed from the callout API to the processor via SQS
export const billingDateMessageSchema = z.object({
	notificationId: z.string().optional(),
	subscriptionNumber: z.string(),
	accountNumber: z.string(),
	chargeNumber: z.string(),
	billingDate: isoDateSchema,
});

export type BillingDateMessage = z.infer<typeof billingDateMessageSchema>;

export const processorQueueName = (stage: string) =>
	`email-reminders-processor-queue-${stage}`;
