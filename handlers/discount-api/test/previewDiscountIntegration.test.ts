/**
 * @group integration
 */
import { getIfDefined } from '@modules/nullAndUndefined';
import type { Stage } from '@modules/stage';
import { cancelSubscription } from '@modules/zuora/cancelSubscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import { discountEndpoint } from '../src/discountEndpoint';
import { previewDiscountSchema } from '../src/responseSchema';
import { createDigitalSubscription, createSubscription } from './helpers';
import { supporterPlusSubscribeBody } from './fixtures/request-bodies/supporterplus-subscribe-body-tier2';

const stage: Stage = 'CODE';
const validIdentityId = '200175946';
const invalidIdentityId = 'qwertyuiop';
``;
test("Subscriptions which don't belong to the provided identity Id are not eligible", async () => {
	const zuoraClient = await ZuoraClient.create(stage);

	console.log('Creating a new digital subscription');
	const subscribeResponse = await createDigitalSubscription(zuoraClient, true);

	const subscriptionNumber = getIfDefined(
		subscribeResponse[0]?.SubscriptionNumber,
		'SubscriptionNumber was undefined in response from Zuora',
	);

	const requestBody = {
		subscriptionNumber: subscriptionNumber,
		preview: true,
	};

	await expect(async () => {
		await discountEndpoint(
			stage,
			true,
			{ 'x-identity-id': invalidIdentityId },
			JSON.stringify(requestBody),
		);
	}).rejects.toThrow('does not belong to identity ID');

	console.log('Cancelling the subscription');
	const cancellationResult = await cancelSubscription(
		zuoraClient,
		subscriptionNumber,
		dayjs().add(1, 'month'),
		true,
	);
	expect(cancellationResult.success).toEqual(true);
}, 30000);
test('Subscriptions on the old price are not eligible', async () => {
	const zuoraClient = await ZuoraClient.create(stage);

	console.log('Creating a new digital subscription');
	const subscribeResponse = await createDigitalSubscription(zuoraClient, true);

	const subscriptionNumber = getIfDefined(
		subscribeResponse[0]?.SubscriptionNumber,
		'SubscriptionNumber was undefined in response from Zuora',
	);

	const requestBody = {
		subscriptionNumber: subscriptionNumber,
		preview: true,
	};

	await expect(async () => {
		await discountEndpoint(
			stage,
			true,
			{ 'x-identity-id': validIdentityId },
			JSON.stringify(requestBody),
		);
	}).rejects.toThrow('it is not eligible for a discount');

	console.log('Cancelling the subscription');
	const cancellationResult = await cancelSubscription(
		zuoraClient,
		subscriptionNumber,
		dayjs().add(1, 'month'),
		true,
	);
	expect(cancellationResult.success).toEqual(true);
}, 30000);

test('Subscriptions on the new price are eligible', async () => {
	const zuoraClient = await ZuoraClient.create(stage);

	console.log('Creating a new digital subscription');
	const subscribeResponse = await createDigitalSubscription(zuoraClient, false);

	const subscriptionNumber = getIfDefined(
		subscribeResponse[0]?.SubscriptionNumber,
		'SubscriptionNumber was undefined in response from Zuora',
	);

	const requestBody = {
		subscriptionNumber: subscriptionNumber,
		preview: true,
	};

	const result = await discountEndpoint(
		stage,
		true,
		{ 'x-identity-id': validIdentityId },
		JSON.stringify(requestBody),
	);
	const eligibilityCheckResult = previewDiscountSchema.parse(
		JSON.parse(result.body),
	);
	expect(eligibilityCheckResult.discountedPrice).toEqual(11.24);
	expect(eligibilityCheckResult.upToPeriodsType).toEqual('Months');

	console.log('Cancelling the subscription');
	const cancellationResult = await cancelSubscription(
		zuoraClient,
		subscriptionNumber,
		dayjs().add(1, 'month'),
		true,
	);
	expect(cancellationResult.success).toEqual(true);
}, 30000);

test('Supporter Plus subscriptions are eligible', async () => {
	const zuoraClient = await ZuoraClient.create(stage);

	console.log('Creating a new S+ subscription');
	const subscribeResponse = await createSubscription(
		zuoraClient,
		supporterPlusSubscribeBody(dayjs()),
	);

	const subscriptionNumber = getIfDefined(
		subscribeResponse[0]?.SubscriptionNumber,
		'SubscriptionNumber was undefined in response from Zuora',
	);

	const requestBody = {
		subscriptionNumber: subscriptionNumber,
		preview: true,
	};

	const result = await discountEndpoint(
		stage,
		true,
		{ 'x-identity-id': validIdentityId },
		JSON.stringify(requestBody),
	);
	const eligibilityCheckResult = previewDiscountSchema.parse(
		JSON.parse(result.body),
	);
	expect(eligibilityCheckResult.discountedPrice).toEqual(0);
	expect(eligibilityCheckResult.upToPeriodsType).toEqual('Months');

	console.log('Cancelling the subscription');
	const cancellationResult = await cancelSubscription(
		zuoraClient,
		subscriptionNumber,
		dayjs().add(1, 'month'),
		true,
	);
	expect(cancellationResult.success).toEqual(true);
}, 30000);
