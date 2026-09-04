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
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { getZuoraCatalogFromS3 } from '@modules/zuora-catalog/S3';
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

test('deleteSecondaryUserEndpoint soft deletes the secondary user and removes the supporter product data record', async () => {
	const zuoraClient = await ZuoraClient.create(stage);
	const identityClient = await IdentityClient.create(
		stage,
		`/${stage}/support/multiple-account-api/identity-client-access-token`,
	);
	const zuoraCatalog = await getZuoraCatalogFromS3(stage);
	const productCatalog = await getProductCatalogFromApi(stage);

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

	const createSubscriptionResponse = await createSubscription(
		zuoraClient,
		productCatalog,
		createInputFields,
		undefined,
	);

	const accountNumber = createSubscriptionResponse.accountNumber;
	const subscriptionName = getIfDefined(
		createSubscriptionResponse.subscriptionNumbers[0],
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

	// Wait for the message above to be processed and written to DynamoDB
	await new Promise((resolve) => setTimeout(resolve, 10000));

	let invitationCode: string | undefined;
	let secondaryIdentityId: string | undefined;

	try {
		const account = await getAccount(zuoraClient, accountNumber);

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

		const secondaryUsersBeforeDelete =
			await secondaryUserRepository.listByIdentity(secondaryIdentityId);
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
			await secondaryUserRepository.delete(
				subscriptionName,
				secondaryIdentityId,
			);
			await deleteSupporterRatePlan(
				stage,
				secondaryIdentityId,
				`${subscriptionName}-${secondaryIdentityId}`,
			);
		}

		await deleteAccount(zuoraClient, accountNumber);
		await deleteSupporterRatePlan(stage, primaryIdentityId, subscriptionName);
	}
}, 120000);
