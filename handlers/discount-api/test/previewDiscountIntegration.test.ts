/**
 * @group integration
 */
import dayjs from 'dayjs';
import type { Stage } from '../../../modules/stage';
import { discountEndpoint } from '../src/endpoints/discountEndpoint';
import { checkDefined } from '../src/nullAndUndefined';
import { previewDiscountSchema } from '../src/responseSchema';
import { cancelSubscription } from '../src/zuora/cancelSubscription';
import { ZuoraClient } from '../src/zuora/zuoraClient';
import { createDigitalSubscription } from './helpers';

const stage: Stage = 'CODE';

test('Subscriptions on the old price are not eligible', async () => {
	const zuoraClient = await ZuoraClient.create(stage);

	console.log('Creating a new digital subscription');
	const subscribeResponse = await createDigitalSubscription(zuoraClient, true);

	const subscriptionNumber = checkDefined(
		subscribeResponse[0]?.SubscriptionNumber,
		'SubscriptionNumber was undefined in response from Zuora',
	);

	const requestBody = {
		subscriptionNumber: subscriptionNumber,
		preview: true,
	};

	await expect(async () => {
		await discountEndpoint(stage, JSON.stringify(requestBody));
	}).rejects.toThrow('it is not eligible for a discount');

	console.log('Cancelling the subscription');
	const cancellationResult = await cancelSubscription(
		zuoraClient,
		subscriptionNumber,
		dayjs().add(1, 'month'),
	);
	expect(cancellationResult.success).toEqual(true);
}, 30000);

test('Subscriptions on the new price are eligible', async () => {
	const zuoraClient = await ZuoraClient.create(stage);

	console.log('Creating a new digital subscription');
	const subscribeResponse = await createDigitalSubscription(zuoraClient, false);

	const subscriptionNumber = checkDefined(
		subscribeResponse[0]?.SubscriptionNumber,
		'SubscriptionNumber was undefined in response from Zuora',
	);

	const requestBody = {
		subscriptionNumber: subscriptionNumber,
		preview: true,
	};

	const result = await discountEndpoint(stage, JSON.stringify(requestBody));
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
	);
	expect(cancellationResult.success).toEqual(true);
}, 30000);
