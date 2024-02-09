import { cancelSubscription } from '@modules/zuora/cancelSubscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';

void (async () => {
	const subscriptionNumber = process.argv[2];
	if (!subscriptionNumber?.startsWith('A-S')) {
		console.log('Please provide a valid Zuora subscription number');
		return;
	}
	const zuoraClient = await ZuoraClient.create('CODE');
	const response = await cancelSubscription(
		zuoraClient,
		subscriptionNumber,
		dayjs(),
	);
	console.log(response);
})();
