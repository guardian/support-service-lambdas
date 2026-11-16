import { z } from 'zod';
import {
	orderNumberSchema,
	subscriptionNumberSchema,
} from '@modules/zuora/identifiers';

/**
 * Input to the refund workflow, built by the cancellation Lambda when it starts an execution.
 *
 * Executions can run for up to 14 days, so changes must stay backward compatible:
 * only add optional fields.
 */
export const refundWorkflowInputSchema = z.object({
	subscriptionNumber: subscriptionNumberSchema,
	accountId: z.string().min(1),
	cancellationOrderNumber: orderNumberSchema,
	// the date the cancellation was made (not its effective date), used as the billing TargetDate
	cancellationBillingDate: z.iso.date(),
	// the eligibility decision made by the cancellation Lambda, never re-checked by the workflow
	refundDue: z.boolean(),
});

export type RefundWorkflowInput = z.infer<typeof refundWorkflowInputSchema>;
