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
import { deleteSecondaryUserEndpoint } from '../src/deleteSecondaryUserEndpoint';
import { InvitationRepository } from '../src/invitationRepository';

const stage = 'CODE';
const subscriptionName = 'A-S00974337';
const secondaryUserEmail = 'integration-test2+multiple-account@theguardian.com';

let invitationCode: string;
let secondaryIdentityId: string;

const invitationRepository = InvitationRepository.create(stage);
const secondaryUserRepository = SecondaryUserRepository.create(stage);
const dynamoClient = new DynamoDBClient({});

jest.setTimeout(30000);

beforeEach(async () => {
	const zuoraClient = await ZuoraClient.create(stage);
	const zuoraCatalog = await getZuoraCatalogFromS3(stage);
	const productCatalog = await getProductCatalogFromApi(stage);
	const identityClient = await IdentityClient.create(
		stage,
		`/${stage}/support/multiple-account-api/identity-client-access-token`,
	);

	const createEndpoint = createInvitationEndpoint(
		invitationRepository,
		identityClient,
		zuoraCatalog,
		productCatalog,
	);

	const subscription = await getSubscription(zuoraClient, subscriptionName);
	const account = await getAccount(zuoraClient, subscription.accountNumber);

	const createResult = await createEndpoint(
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

	const acceptResult = await acceptInvitationEndpoint(
		stage,
		invitationRepository,
		secondaryUserRepository,
		dynamoClient,
		secondaryIdentityId,
		invitationCode,
	);

	expect(acceptResult.statusCode).toBe(200);

	// Wait for a second to allow the async creation of the supporter product
	// data record to complete
	await new Promise((resolve) => setTimeout(resolve, 10000));
});

afterEach(async () => {
	if (invitationCode) {
		const invitation = await invitationRepository.get(invitationCode);
		if (invitation) {
			await invitationRepository.delete(
				invitation.subscriptionName,
				invitationCode,
			);
		}
	}

	if (secondaryIdentityId) {
		await secondaryUserRepository.delete(subscriptionName, secondaryIdentityId);
		await deleteSupporterRatePlan(
			stage,
			secondaryIdentityId,
			`${subscriptionName}-${secondaryIdentityId}`,
		);
	}
});

test('deleteSecondaryUserEndpoint deletes secondary user and supporter product data records', async () => {
	const secondaryUsersBeforeDelete =
		await secondaryUserRepository.get(secondaryIdentityId);
	const matchingSecondaryUserBeforeDelete = secondaryUsersBeforeDelete.find(
		(record) => record.subscriptionName === subscriptionName,
	);
	expect(matchingSecondaryUserBeforeDelete).toBeDefined();

	const supporterProductDataRecordsBeforeDelete =
		(await getSupporterRatePlans(stage, secondaryIdentityId)) ?? [];
	const subscriptionRecordBeforeDelete =
		supporterProductDataRecordsBeforeDelete.find(
			(record) =>
				record.subscriptionName ===
				`${subscriptionName}-${secondaryIdentityId}`,
		);
	expect(subscriptionRecordBeforeDelete).toBeDefined();

	const result = await deleteSecondaryUserEndpoint(
		stage,
		secondaryUserRepository,
		dynamoClient,
		{
			subscriptionName,
			secondaryIdentityId,
		},
	);

	expect(result.statusCode).toBe(204);

	const secondaryUsersAfterDelete =
		await secondaryUserRepository.get(secondaryIdentityId);
	const matchingSecondaryUserAfterDelete = secondaryUsersAfterDelete.find(
		(record) => record.subscriptionName === subscriptionName,
	);
	expect(matchingSecondaryUserAfterDelete).toBeUndefined();

	const supporterProductDataRecordsAfterDelete =
		(await getSupporterRatePlans(stage, secondaryIdentityId)) ?? [];
	const subscriptionRecordAfterDelete =
		supporterProductDataRecordsAfterDelete.find(
			(record) =>
				record.subscriptionName ===
				`${subscriptionName}-${secondaryIdentityId}`,
		);
	expect(subscriptionRecordAfterDelete).toBeUndefined();
}, 20000);
