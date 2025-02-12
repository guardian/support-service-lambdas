import { stageFromEnvironment } from '@modules/stage';
import { getSubscription } from '@modules/zuora/getSubscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { z } from 'zod';
import { BigQueryRecordSchema } from '../bigquery';

export type BigQueryRecord = z.infer<typeof BigQueryRecordSchema>;
export const SubIsActiveInputSchema = BigQueryRecordSchema.extend({
	subStatus: z.string(),
}).strict();
export type SubIsActiveInput = z.infer<typeof SubIsActiveInputSchema>;

export const handler = async (event: SubIsActiveInput) => {
	try {
		const parsedEvent = SubIsActiveInputSchema.parse(event);
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
