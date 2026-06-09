/**
 * This is an integration test, the `@group integration` tag ensures that it will only be run by the `pnpm it-test`
 * command and will not be run during continuous integration.
 *
 * @group integration
 */
import { IdentityClient } from '@modules/identity/identityClient';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { getAccount } from '@modules/zuora/account';
import { getSubscription } from '@modules/zuora/subscription';
import { zuoraSubscriptionSchema } from '@modules/zuora/types';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { getZuoraCatalogFromS3 } from '@modules/zuora-catalog/S3';
import {
	createInvitationEndpoint,
	createInvitationResponseBodySchema,
} from '../src/createInvitationEndpoint';
import { InvitationRepository } from '../src/invitationRepository';
import weekendSub from './fixtures/weekend-subscription.json';

const stage = 'CODE';

test('createInvitationEndpoint saves invitation data and returns invitation code', async () => {
	const zuoraClient = await ZuoraClient.create(stage);
	const zuoraCatalog = await getZuoraCatalogFromS3(stage);
	const productCatalog = await getProductCatalogFromApi(stage);
	const invitationRepository = InvitationRepository.create(stage);
	const identityClient = await IdentityClient.create(
		stage,
		`/${stage}/support/multiple-account-api/identity-client-access-token`,
	);
	const subscriptionName = 'A-S00974337';

	const endpoint = createInvitationEndpoint(
		invitationRepository,
		identityClient,
		zuoraCatalog,
		productCatalog,
	);

	const subscription = await getSubscription(zuoraClient, 'A-S00974337');
	const account = await getAccount(zuoraClient, subscription.accountNumber);
	zuoraSubscriptionSchema.parse(weekendSub);

	const result = await endpoint(
		{
			subscriptionName,
			secondaryUserEmail: 'integration-test2+multiple-account@theguardian.com',
		},
		undefined as never,
		subscription,
		account,
	);

	expect(result.statusCode).toBe(201);
	const resultBody = createInvitationResponseBodySchema.parse(
		JSON.parse(result.body),
	);
	expect(resultBody.invitationCode).toBeDefined();
	await invitationRepository.delete(
		subscriptionName,
		resultBody.invitationCode,
	);
});
