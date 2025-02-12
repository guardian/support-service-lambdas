import { stageFromEnvironment } from '@modules/stage';
import { getSubscription } from '@modules/zuora/getSubscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { z } from 'zod';
import { BigQueryRecordSchema } from '../bigquery';

export type SubIsActiveInput = z.infer<typeof BigQueryRecordSchema>;

export const handler = async (event: SubIsActiveInput) => {
	console.log('Enter lambda. event:', event);
	try {
		const parsedEvent = BigQueryRecordSchema.parse(event);
		const subName = parsedEvent.zuoraSubName;
		const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
		const getSubResponse = await getSubscription(zuoraClient, subName);

		return {
			...parsedEvent,
			subStatus: getSubResponse.status,
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
