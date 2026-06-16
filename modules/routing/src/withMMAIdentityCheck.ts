import { ValidationError } from '@modules/errors';
import { logger } from '@modules/logger/logger';
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

/**
 * Fetches the Zuora subscription and account for the given subscription number,
 * then verifies that the caller's identity (from x-identity-id) matches the
 * subscription owner. Throws a ValidationError (→ 400) if there is a mismatch.
 *
 * Designed to be called inside a hono route handler AFTER input validation
 * (c.req.valid()) has already succeeded, so that invalid requests are rejected
 * cheaply before any Zuora API calls are made.
 *
 * @example
 * const handler: RouteHandler<typeof route> = async (c) => {
 *   const { subscriptionNumber } = c.req.valid('param'); // validate first
 *   const { zuoraClient, subscription, account } =
 *     await fetchSubscriptionWithIdentityCheck(stage, subscriptionNumber, c.req.header('x-identity-id'));
 *   // ... business logic
 * };
 */
export async function fetchSubscriptionWithIdentityCheck(
	stage: Stage,
	subscriptionNumber: string,
	identityId: string | undefined,
): Promise<{
	zuoraClient: ZuoraClient;
	subscription: ZuoraSubscription;
	account: ZuoraAccount;
}> {
	const zuoraClient = await ZuoraClient.create(stage);
	logger.log('Getting the subscription and account details from Zuora');
	const subscription = await getSubscription(zuoraClient, subscriptionNumber);
	const account = await getAccount(zuoraClient, subscription.accountNumber);
	logger.mutableAddContext(subscriptionNumber);
	assertIdentityIdMatches(account, { 'x-identity-id': identityId });
	return { zuoraClient, subscription, account };
}
