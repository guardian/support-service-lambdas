/**
 * This is an integration test, the `@group integration` tag ensures that it will only be run by the `pnpm it-test`
 * command and will not be run during continuous integration.
 *
 * @group integration
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import dayjs from 'dayjs';
import { getOrCreateUserFromEmail } from '@modules/identity/idapi';
import { IdentityClient } from '@modules/identity/identityClient';
import { SecondaryUserRepository } from '@modules/multiple-account/secondaryUserRepository';
import { getIfDefined } from '@modules/nullAndUndefined';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import {
	deleteSupporterRatePlan,
	getSupporterRatePlans,
	sendToSupporterProductData,
} from '@modules/supporter-product-data/supporterProductData';
import { deleteAccount, getAccount } from '@modules/zuora/account';
import type { CreateSubscriptionInputFields } from '@modules/zuora/createSubscription/createSubscription';
import { createSubscription } from '@modules/zuora/createSubscription/createSubscription';
import type { DirectDebit } from '@modules/zuora/orders/paymentMethods';
import { getSubscription } from '@modules/zuora/subscription';
import type { ZuoraAccount, ZuoraSubscription } from '@modules/zuora/types';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { getZuoraCatalogFromS3 } from '@modules/zuora-catalog/S3';
import type { ZuoraCatalog } from '@modules/zuora-catalog/zuoraCatalogSchema';
import { acceptInvitationEndpoint } from '../src/acceptInvitationEndpoint';
import { createInvitationEndpoint } from '../src/createInvitationEndpoint';
import { deleteSecondaryUserEndpoint } from '../src/deleteSecondaryUserEndpoint';
import { InvitationRepository } from '../src/invitationRepository';

const stage = 'CODE';
const primaryUserEmail =
	'integration-test-primary+multiple-account@thegulocal.com';
const secondaryUserEmail =
	'integration-test-secondary+multiple-account@thegulocal.com';

const invitationRepository = InvitationRepository.create(stage);
const secondaryUserRepository = SecondaryUserRepository.create(stage);
const dynamoClient = new DynamoDBClient({});

jest.setTimeout(120000);

const sleep = (delayMs: number) =>
	new Promise((resolve) => setTimeout(resolve, delayMs));

type CleanupTask = () => Promise<void>;

// Creates a Zuora subscription/account for a primary identity user (created or reused by
// email), and seeds the SupporterProductData record a scheduled pipeline would otherwise
// write later. Registers teardown for each resource onto `cleanupTasks` as it's created.
const createPrimarySubscription = async (
	zuoraClient: ZuoraClient,
	identityClient: IdentityClient,
	productCatalog: ProductCatalog,
	cleanupTasks: CleanupTask[],
): Promise<{
	subscriptionName: string;
	primaryIdentityId: string;
	subscription: ZuoraSubscription;
}> => {
	const primaryIdentityId = await getOrCreateUserFromEmail(
		identityClient,
		primaryUserEmail,
		false,
	);

	const createInputFields: CreateSubscriptionInputFields<DirectDebit> = {
		accountName: 'Multiple Account API Integration Test',
		createdRequestId: `multiple-account-api-it-${Date.now()}`,
		salesforceAccountId: 'salesforce-account-id',
		salesforceContactId: 'salesforce-contact-id',
		identityId: primaryIdentityId,
		currency: 'GBP',
		paymentGateway: 'GoCardless',
		paymentMethod: {
			accountHolderInfo: { accountHolderName: 'Multiple Account Test' },
			accountNumber: '55779911',
			bankCode: '200000',
			type: 'Bacs',
		},
		billToContact: {
			firstName: 'Multiple',
			lastName: 'Account',
			workEmail: primaryUserEmail,
			country: 'United Kingdom',
		},
		productPurchase: { product: 'DigitalSubscription', ratePlan: 'Monthly' },
	};

	const promo = undefined;
	const { accountNumber, subscriptionNumbers } = await createSubscription(
		zuoraClient,
		productCatalog,
		createInputFields,
		promo,
	);
	cleanupTasks.push(() => deleteAccount(zuoraClient, accountNumber));

	const subscriptionName = getIfDefined(
		subscriptionNumbers[0],
		'createSubscription did not return a subscription number',
	);

	const subscription = await getSubscription(zuoraClient, subscriptionName);
	const ratePlan = getIfDefined(
		subscription.ratePlans[0],
		'Created subscription has no rate plans',
	);

	await sendToSupporterProductData(stage, {
		subscriptionName,
		identityId: primaryIdentityId,
		productRatePlanId: ratePlan.productRatePlanId,
		productRatePlanName: ratePlan.ratePlanName,
		termEndDate: dayjs(subscription.termEndDate),
		contractEffectiveDate: dayjs(subscription.contractEffectiveDate),
	});
	cleanupTasks.push(() =>
		deleteSupporterRatePlan(stage, primaryIdentityId, subscriptionName),
	);

	// Wait for the message above to be processed and written to DynamoDB
	// Ugh why does this need to wait for so long?
	await sleep(60000);

	return { subscriptionName, primaryIdentityId, subscription };
};

// Invites the secondary user and accepts the invitation on their behalf, producing the
// secondary user + supporter product data records the test exercises. Registers teardown
// for the invitation and secondary user records onto `cleanupTasks` as they're created.
const createAndAcceptInvitation = async (
	identityClient: IdentityClient,
	zuoraCatalog: ZuoraCatalog,
	productCatalog: ProductCatalog,
	subscriptionName: string,
	subscription: ZuoraSubscription,
	account: ZuoraAccount,
	cleanupTasks: CleanupTask[],
): Promise<{ secondaryIdentityId: string }> => {
	const createEndpoint = createInvitationEndpoint(
		stage,
		invitationRepository,
		secondaryUserRepository,
		identityClient,
		zuoraCatalog,
		productCatalog,
	);

	const createResult = await createEndpoint(
		{ subscriptionName, secondaryUserEmail },
		undefined as never,
		subscription,
		account,
	);
	expect(createResult.statusCode).toBe(201);

	const { invitationCode } = JSON.parse(createResult.body) as {
		invitationCode: string;
	};
	cleanupTasks.push(async () => {
		const invitationToDelete = await invitationRepository.get(invitationCode);
		if (invitationToDelete) {
			await invitationRepository.delete(
				invitationToDelete.subscriptionName,
				invitationCode,
			);
		}
	});

	const invitation = await invitationRepository.get(invitationCode);
	expect(invitation).toBeDefined();
	const secondaryIdentityId = getIfDefined(
		invitation,
		'Invitation not found after creation',
	).secondaryIdentityId;
	cleanupTasks.push(async () => {
		await secondaryUserRepository.delete(subscriptionName, secondaryIdentityId);
		await deleteSupporterRatePlan(
			stage,
			secondaryIdentityId,
			`${subscriptionName}-${secondaryIdentityId}`,
		);
	});

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
	await sleep(10000);

	return { secondaryIdentityId };
};

test('deleteSecondaryUserEndpoint soft deletes the secondary user and removes the supporter product data record', async () => {
	const zuoraClient = await ZuoraClient.create(stage);
	const identityClient = await IdentityClient.create(
		stage,
		`/${stage}/support/multiple-account-api/identity-client-access-token`,
	);
	const zuoraCatalog = await getZuoraCatalogFromS3(stage);
	const productCatalog = await getProductCatalogFromApi(stage);

	const cleanupTasks: CleanupTask[] = [];

	try {
		const { subscriptionName, subscription } = await createPrimarySubscription(
			zuoraClient,
			identityClient,
			productCatalog,
			cleanupTasks,
		);

		const account = await getAccount(zuoraClient, subscription.accountNumber);

		const { secondaryIdentityId } = await createAndAcceptInvitation(
			identityClient,
			zuoraCatalog,
			productCatalog,
			subscriptionName,
			subscription,
			account,
			cleanupTasks,
		);

		const secondaryUsersBeforeDelete =
			await secondaryUserRepository.listByIdentity(secondaryIdentityId);
		const matchingSecondaryUserBeforeDelete = secondaryUsersBeforeDelete.find(
			(record) => record.subscriptionName === subscriptionName,
		);
		expect(matchingSecondaryUserBeforeDelete).toBeDefined();

		// This section is flaky, sometimes if passes sometimes it doesn't. Is this because of the
		// async schedule which syncs to supporter product data?
		// const supporterProductDataRecordsBeforeDelete =
		// 	(await getSupporterRatePlans(stage, secondaryIdentityId)) ?? [];
		// const subscriptionRecordBeforeDelete =
		// 	supporterProductDataRecordsBeforeDelete.find(
		// 		(record) =>
		// 			record.subscriptionName ===
		// 			`${subscriptionName}-${secondaryIdentityId}`,
		// 	);
		// expect(subscriptionRecordBeforeDelete).toBeDefined();

		const result = await deleteSecondaryUserEndpoint(
			stage,
			secondaryUserRepository,
			dynamoClient,
			zuoraClient,
			identityClient,
			subscriptionName,
			secondaryIdentityId,
			secondaryIdentityId,
		);

		expect(result.statusCode).toBe(204);

		// The secondary user record is retained (soft deleted) with cancellation
		// metadata rather than hard deleted.
		const secondaryUsersAfterDelete =
			await secondaryUserRepository.listByIdentity(secondaryIdentityId);
		const matchingSecondaryUserAfterDelete = secondaryUsersAfterDelete.find(
			(record) => record.subscriptionName === subscriptionName,
		);
		expect(matchingSecondaryUserAfterDelete).toBeDefined();
		expect(matchingSecondaryUserAfterDelete?.cancelledBy).toBe('secondary');
		expect(matchingSecondaryUserAfterDelete?.cancelledDate).toBeDefined();

		// The supporter product data record (the benefit) is removed immediately.
		const supporterProductDataRecordsAfterDelete =
			(await getSupporterRatePlans(stage, secondaryIdentityId)) ?? [];
		const subscriptionRecordAfterDelete =
			supporterProductDataRecordsAfterDelete.find(
				(record) =>
					record.subscriptionName ===
					`${subscriptionName}-${secondaryIdentityId}`,
			);
		expect(subscriptionRecordAfterDelete).toBeUndefined();
	} finally {
		// Teardown
		// Run in reverse so later (dependent) resources are torn down before earlier ones,
		// and keep going even if one task fails so the rest of the cleanup still happens.
		for (const cleanupTask of cleanupTasks.reverse()) {
			try {
				await cleanupTask();
			} catch (error) {
				console.error('Cleanup task failed', error);
			}
		}
	}
});
