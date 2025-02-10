import { stageFromEnvironment } from '@modules/stage';
import { getSubscription } from '@modules/zuora/getSubscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';

export const handler = async (event: {
	item: {
		firstName: string;
		nextPaymentDate: string;
		paymentAmount: number;
		paymentCurrency: string;
		paymentFrequency: string;
		productName: string;
		sfContactId: string;
		zuoraSubName: string;
		workEmail: string;
	};
}) => {
	try {
		const subName = event.item.zuoraSubName;
		const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
		const getSubResponse = await getSubscription(zuoraClient, subName + '222x');

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
