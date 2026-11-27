import { z } from 'zod';
import { ZuoraError } from '@modules/zuora/errors/zuoraError';
import { getOrder } from '@modules/zuora/orders/getOrder';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

// Zuora's error for an order number that doesn't exist, including one that has been deleted
const invalidOrderNumberCode = '50000020';

export async function orderExists(
	zuoraClient: ZuoraClient,
	orderNumber: string,
): Promise<boolean> {
	try {
		await getOrder(zuoraClient, orderNumber);
		return true;
	} catch (error) {
		if (
			error instanceof ZuoraError &&
			error.zuoraErrorDetails.some(
				({ code }) => code === invalidOrderNumberCode,
			)
		) {
			return false;
		}
		throw error;
	}
}

/**
 * Deleting a cancellation order returns the subscription to the version before it, so it is Active again.
 */
export async function deleteOrder(
	zuoraClient: ZuoraClient,
	orderNumber: string,
): Promise<void> {
	await zuoraClient.delete(
		`/v1/orders/${orderNumber}`,
		z.object({ success: z.literal(true) }),
	);
}
