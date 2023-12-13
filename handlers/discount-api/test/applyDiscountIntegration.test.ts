/**
 * Creates test subscriptions in various state to test the price rise logic
 *
 * @group integration
 */

import dayjs from 'dayjs';
import type { Stage } from '../../../modules/stage';
import { checkDefined } from '../src/nullAndUndefined';
import { addDiscount } from '../src/zuora/addDiscount';
import { getSubscription } from '../src/zuora/getSubscription';
import { createZuoraClient } from '../src/zuora/zuoraClient';
import { createDigitalSubscription, doPriceRise } from './helpers';

const stage: Stage = 'CODE';
const subscribeDate = dayjs();
const nextBillingDate = subscribeDate.add(1, 'month');

test('createDigitalSubscription', async () => {
	const zuoraClient = await createZuoraClient(stage);

	console.log('Creating a new digital subscription');
	const subscribeResponse = await createDigitalSubscription(zuoraClient, false);

	const subscriptionNumber = checkDefined(
		subscribeResponse[0]?.SubscriptionNumber,
		'SubscriptionNumber was undefined in response from Zuora',
	);

	console.log('Getting the subscription details from Zuora');
	const subscription = await getSubscription(zuoraClient, subscriptionNumber);

	expect(subscription.subscriptionNumber).toEqual(subscriptionNumber);
}, 30000);

test('createPriceRiseSubscription', async () => {
	const zuoraClient = await createZuoraClient(stage);

	console.log('Creating a new digital subscription');
	const subscribeResponse = await createDigitalSubscription(zuoraClient, true);

	const subscriptionNumber = checkDefined(
		subscribeResponse[0]?.SubscriptionNumber,
		'SubscriptionNumber was undefined in response from Zuora',
	);

	console.log('Getting the subscription details from Zuora');
	const subscription = await getSubscription(zuoraClient, subscriptionNumber);

	console.log('Updating the subscription to trigger a price rise');
	const priceRisen = await doPriceRise(
		zuoraClient,
		subscription,
		nextBillingDate,
	);

	expect(priceRisen.success).toEqual(true);

	console.log('Apply a discount to the subscription');
	const discounted = await addDiscount(
		zuoraClient,
		subscriptionNumber,
		nextBillingDate,
		'8ad09be48b23d33f018b23e53afd522d',
	);

	expect(discounted.success).toEqual(true);
}, 30000);
