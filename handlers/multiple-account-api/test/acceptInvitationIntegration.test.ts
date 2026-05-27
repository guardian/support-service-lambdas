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
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { getZuoraCatalogFromS3 } from '@modules/zuora-catalog/S3';
import { acceptInvitationEndpoint } from '../src/acceptInvitationEndpoint';
import { createInvitationEndpoint } from '../src/createInvitationEndpoint';
import { InvitationRepository } from '../src/invitationRepository';
import { SecondaryUserRepository } from '../src/secondaryUserRepository';

const stage = 'CODE';
const subscriptionName = 'A-S00974337';
const secondaryUserEmail = 'integration-test2+multiple-account@theguardian.com';

let invitationCode: string;
let secondaryIdentityId: string;

const invitationRepository = InvitationRepository.create(stage);
const secondaryUserRepository = SecondaryUserRepository.create(stage);

beforeEach(async () => {
	const zuoraClient = await ZuoraClient.create(stage);
	const zuoraCatalog = await getZuoraCatalogFromS3(stage);
	const productCatalog = await getProductCatalogFromApi(stage);
	const identityClient = await IdentityClient.create(
		stage,
		`/${stage}/support/multiple-account-api/identity-client-access-token`,
	);

	const endpoint = createInvitationEndpoint(
		invitationRepository,
		identityClient,
		zuoraCatalog,
		productCatalog,
	);

	const subscription = await getSubscription(zuoraClient, subscriptionName);
	const account = await getAccount(zuoraClient, subscription.accountNumber);

	const createResult = await endpoint(
		{ subscriptionName, secondaryUserEmail },
		undefined as never,
		subscription,
		account,
	);

	expect(createResult.statusCode).toBe(201);

	const body = JSON.parse(createResult.body) as { invitationCode: string };
	invitationCode = body.invitationCode;

	const invitation = await invitationRepository.get(invitationCode);
	expect(invitation).toBeDefined();
	secondaryIdentityId = invitation!.secondaryIdentityId;
});

afterEach(async () => {
	// Clean up the invitation if it still exists (e.g. if acceptInvitation failed)
	const invitation = await invitationRepository.get(invitationCode);
	if (invitation) {
		await invitationRepository.delete(
			invitation.subscriptionName,
			invitationCode,
		);
	}

	// Clean up the secondary user record created by acceptInvitationEndpoint
	await secondaryUserRepository.delete(subscriptionName, secondaryIdentityId);
	// TODO: delete supporter product data child record
});

test('acceptInvitationEndpoint accepts an invitation and creates a secondary user record', async () => {
	const result = await acceptInvitationEndpoint(
		stage,
		secondaryIdentityId,
		invitationCode,
		invitationRepository,
		secondaryUserRepository,
	);

	expect(result.statusCode).toBe(200);

	// The invitation should have been deleted as part of accepting
	const invitation = await invitationRepository.get(invitationCode);
	expect(invitation).toBeUndefined();

	// A secondary user record should have been created
	const secondaryUsers = await secondaryUserRepository.get(secondaryIdentityId);
	expect(secondaryUsers).toHaveLength(1);
	expect(secondaryUsers[0]?.subscriptionName).toBe(subscriptionName);
	expect(secondaryUsers[0]?.secondaryIdentityId).toBe(secondaryIdentityId);
});
