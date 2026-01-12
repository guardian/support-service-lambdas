import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { getSubscription } from '../src';

const validSubscriptionId = 'A-S00000000';
const stage = 'CODE';

async function run() {
	const zuoraClient = await ZuoraClient.create(stage);
	return getSubscription(zuoraClient, validSubscriptionId);
}

run().then(console.log);
