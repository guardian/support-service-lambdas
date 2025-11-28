import { previewDiscountHandler } from '../src';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { createSupporterPlusSubscription } from '../../../modules/zuora/test/it-helpers/createGuardianSubscription';
import { APIGatewayProxyEvent } from 'aws-lambda';

const validIdentityId = '200175946';
const stage = 'CODE';

async function run() {
	const zuoraClient = await ZuoraClient.create(stage);

	console.log('Creating a new S+ subscription');
	const subscriptionNumber = await createSupporterPlusSubscription(zuoraClient);

	return previewDiscountHandler(stage)({
		body: JSON.stringify({ subscriptionNumber }),
		headers: { 'x-identity-id': validIdentityId },
	} as unknown as APIGatewayProxyEvent);
}

run().then(console.log);
