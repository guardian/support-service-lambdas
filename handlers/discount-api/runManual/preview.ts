import { previewDiscountHandler } from '../src';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { createSupporterPlusSubscription } from '../../../modules/zuora/test/it-helpers/createGuardianSubscription';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { withMMAIdentityCheck } from '@modules/routing/withMMAIdentityCheck';

/*
This is a handy manual script to trigger a preview locally using sandbox zuora.
This is useful because it uses both a POST call for billing preview and a GET call for the account/subscription

To run, get aws credentials then right click and click Run 'preview.ts'
 */

const validIdentityId = '200175946';
const stage = 'CODE';

async function run() {
	const zuoraClient = await ZuoraClient.create(stage);

	console.log('Creating a new S+ subscription');
	const subscriptionNumber = await createSupporterPlusSubscription(zuoraClient);

	return withMMAIdentityCheck(
		stage,
		previewDiscountHandler(stage),
		({ body }) => body.subscriptionNumber,
	)(
		{
			body: JSON.stringify({ subscriptionNumber }),
			headers: { 'x-identity-id': validIdentityId },
		} as unknown as APIGatewayProxyEvent,
		{},
		{ subscriptionNumber },
	);
}

run().then(console.log);
