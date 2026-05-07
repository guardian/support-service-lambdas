import { logger } from '@modules/routing/logger';
import { getAccount } from '@modules/zuora/account';
import { getSubscription } from '@modules/zuora/subscription';
import type { ZuoraAccount, ZuoraSubscription } from '@modules/zuora/types';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { APIGatewayProxyResult } from 'aws-lambda';
import type { RequestBody } from './schemas';

export async function isActiveEndpoint(
	zuoraClient: ZuoraClient,
	body: RequestBody,
): Promise<APIGatewayProxyResult> {
	logger.log('Checking if subscription is active', body.subscriptionId);

	const subscription = await getSubscription(zuoraClient, body.subscriptionId);
	const account = await getAccount(zuoraClient, subscription.accountNumber);
	if (isValid(subscription, account, body.postCode)) {
		return Promise.resolve({
			statusCode: 200,
			body: JSON.stringify({
				isActive: true,
				renews: subscription.termEndDate,
			}),
		});
	}

	return Promise.resolve({
		statusCode: 200,
		body: JSON.stringify({ isActive: false }),
	});
}

function isValid(
	subscription: ZuoraSubscription,
	account: ZuoraAccount,
	postCode: string,
): boolean {
	const subscriptionActive = subscription.status === 'Active';
	const containsPostCode =
		account.billToContact.zipCode.replaceAll(' ', '') ===
		postCode.replaceAll(' ', '');
	return subscriptionActive && containsPostCode;
}
