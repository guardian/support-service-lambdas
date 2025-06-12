import { stageFromEnvironment } from '@modules/stage';
import { getPaymentMethods } from '@modules/zuora/getPaymentMethodsForAccountId';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { z } from 'zod';
import { BigQueryRecordSchema } from '../types';

export type CheckForActivePaymentMethodInput = z.infer<
	typeof BigQueryRecordSchema
>;

export const handler = async (event: {
	account_id: string;
	hasActiveSub: boolean;
}) => {
	try {
		const parsedEvent = BigQueryRecordSchema.parse(event);
		const zuoraClient = await ZuoraClient.create(stageFromEnvironment());

		return {
			account_id: parsedEvent.account_id,
			hasActivePaymentMethod: await hasActivePaymentMethod(
				zuoraClient,
				parsedEvent.account_id,
			),
		};
	} catch (error) {
		return {
			...event,
			subStatus: 'Error',
			errorDetail:
				error instanceof Error ? error.message : JSON.stringify(error, null, 2),
		};
	}
};

// const queryResponseSchema = z.object({
// 	done: z.boolean(),
// 	size: z.number(),
// });

export const hasActivePaymentMethod = async (
	zuoraClient: ZuoraClient,
	accountId: string,
): Promise<boolean> => {
	const result = await getPaymentMethods(zuoraClient, accountId);
	console.log('Payment methods result:', result);
	return true;
};
