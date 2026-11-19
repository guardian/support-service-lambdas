import { z } from 'zod';
import {
	accountNumberSchema,
	orderNumberSchema,
	subscriptionNumberSchema,
} from '@modules/zuora/identifiers';

/**
 * Input to the refund workflow, built by the cancellation Lambda when it starts an execution.
 *
 * Executions can run for up to 14 days, so take care when changing the schema.
 */
export const refundWorkflowInputSchema = z.object({
	subscriptionNumber: subscriptionNumberSchema,
	accountNumber: accountNumberSchema,
	cancellationOrderNumber: orderNumberSchema,
	// the date the cancellation was made (not its effective date), used as the billing TargetDate
	cancellationBillingDate: z.iso.date(),
	// decided by the cancellation Lambda: if true, generate the cancellation invoice and refund,
	// otherwise go straight to the payment settlement check
	refundDue: z.boolean(),
});

export type RefundWorkflowInput = z.infer<typeof refundWorkflowInputSchema>;
