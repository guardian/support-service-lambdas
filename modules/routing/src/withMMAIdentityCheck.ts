import { ValidationError } from '@modules/errors';
import type { Stage } from '@modules/stage';
import { getAccount } from '@modules/zuora/account';
import { getSubscription } from '@modules/zuora/subscription';
import type {
	ZuoraAccount,
	ZuoraSubscription,
} from '@modules/zuora/types/objects';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyEventHeaders,
	APIGatewayProxyResult,
} from 'aws-lambda';
import { logger } from '@modules/routing/logger';
import type { Handler } from '@modules/routing/router';

export function assertIdentityIdMatches(
	account: ZuoraAccount,
	headers: APIGatewayProxyEventHeaders,
) {
	const identityIdFromRequest = headers['x-identity-id'];
	logger.log(`Checking subscription is owned by the currently logged in user`);
	if (
		identityIdFromRequest &&
		account.basicInfo.identityId !== identityIdFromRequest
	) {
		throw new ValidationError(
			`Subscription does not belong to identity ID ${identityIdFromRequest}`,
		);
	}
	logger.log(`Subscription is owned by identity user ${identityIdFromRequest}`);
}

export const withMMAIdentityCheck =
	<TPath, TBody>(
		stage: Stage,
		handler: (
			body: TBody,
			zuoraClient: ZuoraClient,
			subscription: ZuoraSubscription,
			account: ZuoraAccount,
		) => Promise<APIGatewayProxyResult>,
		extractSubscriptionNumber: (parsed: { path: TPath; body: TBody }) => string,
	): Handler<Pick<APIGatewayProxyEvent, 'headers'>, TPath, TBody> =>
	async (
		event: Pick<APIGatewayProxyEvent, 'headers'>,
		path: TPath,
		body: TBody,
	): Promise<APIGatewayProxyResult> => {
		const zuoraClient = await ZuoraClient.create(stage);
		logger.log('Getting the subscription and account details from Zuora');

		const subscriptionNumber = extractSubscriptionNumber({ path, body });
		const subscription = await getSubscription(zuoraClient, subscriptionNumber);

		const account = await getAccount(zuoraClient, subscription.accountNumber);

		logger.mutableAddContext(subscriptionNumber);
		assertIdentityIdMatches(account, event.headers);
		return await handler(body, zuoraClient, subscription, account);
	};
