import {
	listOrdersBySubscriptionNumber,
	subscriptionNameSchema,
} from '@modules/zuora/orders/listOrdersBySubscriptionNumber';
import { ZuoraClient } from '@modules/zuora/zuoraClient';

const validSubscriptionId = 'A-S00319147';
const stage = 'CODE';

async function run() {
	const zuoraClient = await ZuoraClient.create(stage);
	return listOrdersBySubscriptionNumber(
		zuoraClient,
		subscriptionNameSchema.parse(validSubscriptionId),
	);
}

run().then(console.log).catch(console.error);
