import { z } from 'zod';
import { logger } from '@modules/logger/logger';
import { stageFromEnvironment } from '@modules/stage';
import { subscriptionNumberSchema } from '@modules/zuora/identifiers';
import type { CancellationReasonCustomFields } from '@modules/zuora/orders/orderRequests';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { getSubscriptionCancellation } from '../zuora/subscriptionCancellation';

const getCancellationReasonInputSchema = z.object({
	subscriptionNumber: subscriptionNumberSchema,
});

type GetCancellationReasonInput = z.infer<
	typeof getCancellationReasonInputSchema
>;

/**
 * Reads the cancellation reasons before backdating, which deletes the cancellation order and the reasons with it.
 * They are kept in the workflow state, so they survive backdateCancellation failing after the delete.
 */
export const handler = async (
	event: unknown,
): Promise<{ cancellationReasons: CancellationReasonCustomFields }> => {
	const input = getCancellationReasonInputSchema.parse(event);
	logger.resetContext();
	logger.mutableAddContext(input.subscriptionNumber);
	const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
	return {
		cancellationReasons: await getCancellationReason(zuoraClient, input),
	};
};

export async function getCancellationReason(
	zuoraClient: ZuoraClient,
	{ subscriptionNumber }: GetCancellationReasonInput,
): Promise<CancellationReasonCustomFields> {
	const { status, UserCancellationReason__c, CancellationReason__c } =
		await getSubscriptionCancellation(zuoraClient, subscriptionNumber);
	if (status !== 'Cancelled') {
		// an Active subscription has lost its cancellation reasons
		throw new Error(`Subscription is ${status}, expected Cancelled`);
	}
	return {
		...(UserCancellationReason__c && { UserCancellationReason__c }),
		...(CancellationReason__c && { CancellationReason__c }),
	};
}
