/**
 * This is an integration test, the `@group integration` tag ensures that it will only be run by the `pnpm it-test`
 * command and will not be run during continuous integration.
 *
 * @group integration
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { IdentityClient } from '@modules/identity/identityClient';
import { SecondaryUserRepository } from '@modules/multiple-account/secondaryUserRepository';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import {
	deleteSupporterRatePlan,
	getSupporterRatePlans,
} from '@modules/supporter-product-data/supporterProductData';
import { getAccount } from '@modules/zuora/account';
import { getSubscription } from '@modules/zuora/subscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { getZuoraCatalogFromS3 } from '@modules/zuora-catalog/S3';
import { acceptInvitationEndpoint } from '../src/acceptInvitationEndpoint';
import { createInvitationEndpoint } from '../src/createInvitationEndpoint';
import { InvitationRepository } from '../src/invitationRepository';

const stage = 'CODE';
const subscriptionName = 'A-S00974337';
const secondaryUserEmail = 'integration-test2+multiple-account@theguardian.com';

let invitationCode: string;
let secondaryIdentityId: string;

const invitationRepository = InvitationRepository.create(stage);
const secondaryUserRepository = SecondaryUserRepository.create(stage);
const dynamoClient = new DynamoDBClient({});

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
	await deleteSupporterRatePlan(
		stage,
		secondaryIdentityId,
		`${subscriptionName}-${secondaryIdentityId}`,
	);
});

test('acceptInvitationEndpoint accepts an invitation and creates a secondary user record', async () => {
	const result = await acceptInvitationEndpoint(
		stage,
		secondaryIdentityId,
		invitationCode,
		invitationRepository,
		secondaryUserRepository,
		dynamoClient,
	);

	expect(result.statusCode).toBe(200);

	// Wait for a second to allow the async creation of the supporter product
	// data record to complete
	await new Promise((resolve) => setTimeout(resolve, 10000));

	// The invitation should have been deleted as part of accepting
	const invitation = await invitationRepository.get(invitationCode);
	expect(invitation).toBeUndefined();

	// A secondary user record should have been created
	const secondaryUsers = await secondaryUserRepository.get(secondaryIdentityId);
	expect(secondaryUsers).toHaveLength(1);
	expect(secondaryUsers[0]?.subscriptionName).toBe(subscriptionName);
	expect(secondaryUsers[0]?.secondaryIdentityId).toBe(secondaryIdentityId);

	// A secondary subscription record should have been created
	const supporterProductDataRecords =
		(await getSupporterRatePlans(stage, secondaryIdentityId)) ?? [];
	expect(supporterProductDataRecords.length).toBeGreaterThan(0);
	// Won't work until supporter product data lambdas are updated
	// expect(supporterProductDataRecords[0]?.primarySubscriptionName).toBe(
	// 	subscriptionName,
	// );
	expect(supporterProductDataRecords[0]?.identityId).toBe(secondaryIdentityId);
	expect(supporterProductDataRecords[0]?.productRatePlanName).toBe(
		'Digital Plus Secondary User',
	);
	expect(supporterProductDataRecords[0]?.subscriptionName).toBe(
		`${subscriptionName}-${secondaryIdentityId}`,
	);
}, 15000);
