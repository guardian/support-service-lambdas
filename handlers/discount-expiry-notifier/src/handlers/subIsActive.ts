import { stageFromEnvironment } from '@modules/stage';
import { getSubscription } from '@modules/zuora/getSubscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';

export const handler = async () => {
	try {
		//sub name will be passed in via json path in state machine
		const subName = process.env.SUB_NAME ?? 'A-S00954053';

		const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
		const getSubResponse = await getSubscription(
			zuoraClient,
			subName
		);
		return {
			status: getSubResponse.status,
		};
	} catch (error) {
		throw new Error(
			`Error retrieving sub from Zuora: ${JSON.stringify(error)}`,
		);
	}
};
