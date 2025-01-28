import { stageFromEnvironment } from '@modules/stage';
import { getSubscription } from '@modules/zuora/getSubscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';

export const handler = async (event: {
	item: {
		subName: string;
		firstName: string;
		paymentAmount: number;
		paymentFrequency: string;
		nextPaymentDate: string;
	};
}) => {
	try {
		const subName = event.item.subName;
		const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
		const getSubResponse = await getSubscription(zuoraClient, subName);

		return {
			...event.item,
			status: getSubResponse.status,
		};
	} catch (error) {
		throw new Error(
			`Error retrieving sub from Zuora: ${JSON.stringify(error)}`,
		);
	}
};
