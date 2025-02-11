import { stageFromEnvironment } from '@modules/stage';
import { getSubscription } from '@modules/zuora/getSubscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { RecordForEmailSend } from '../types';

export const handler = async (event: {
	item: RecordForEmailSend;
}) => {
	try {
		const subName = event.item.zuoraSubName;
		const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
		const getSubResponse = await getSubscription(zuoraClient, subName);

		return {
			...event.item,
			subStatus: getSubResponse.status,
		};
	} catch (error) {
		return {
			...event.item,
			subStatus: 'Error',
			errorDetail:
				error instanceof Error ? error.message : JSON.stringify(error, null, 2),
		};
	}
};
