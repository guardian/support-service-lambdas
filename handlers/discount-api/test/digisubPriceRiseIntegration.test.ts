/**
 * Creates test subscriptions in various state to test the price rise logic
 *
 * @group integration
 */

import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { Stage } from '../../../modules/Stage';
import { BearerTokenProvider } from '../src/zuora/bearerTokenProvider';
import { getSubscription } from '../src/zuora/getSubscription';
import { getOAuthClientCredentials } from '../src/zuora/oAuthCredentials';
import { ZuoraClient } from '../src/zuora/zuoraClient';
import type {
	ZuoraSubscribeResponse,
	ZuoraSubscription,
	ZuoraSuccessResponse,
} from '../src/zuora/zuoraSchemas';
import {
	zuoraSubscribeResponseSchema,
	zuoraSuccessResponseSchema,
} from '../src/zuora/zuoraSchemas';
import { digiSubSubscribeBody } from './fixtures/digi-sub-subscribe-body-old-price';
import { updateSubscriptionBody } from './fixtures/update-subscription-body';

const stage: Stage = 'CODE';
const subscribeDate = dayjs().add(-3, 'weeks');
const nextBillingDate = subscribeDate.add(1, 'month');
const createDigitalSubscription = async (zuoraClient: ZuoraClient) => {
	const path = `/v1/action/subscribe`;
	const body = JSON.stringify(digiSubSubscribeBody(subscribeDate));

	return zuoraClient.post<ZuoraSubscribeResponse>(
		path,
		body,
		zuoraSubscribeResponseSchema,
	);
};

const doPriceRise = async (
	zuoraClient: ZuoraClient,
	subscription: ZuoraSubscription,
	contractEffectiveDate: Dayjs,
): Promise<ZuoraSuccessResponse> => {
	const path = `/v1/subscriptions/${subscription.subscriptionNumber}`;
	const ratePlanId = subscription.ratePlans[0]?.id;
	if (!ratePlanId) {
		throw new Error('RatePlanId was undefined in response from Zuora');
	}
	const body = JSON.stringify(
		updateSubscriptionBody(contractEffectiveDate, ratePlanId),
	);
	return zuoraClient.put(path, body, zuoraSuccessResponseSchema);
};

test('createPriceRiseSubscription', async () => {
	const credentials = await getOAuthClientCredentials(stage);
	const bearerTokenProvider = new BearerTokenProvider(stage, credentials);
	const zuoraClient = new ZuoraClient(stage, bearerTokenProvider);

	console.log('Creating a new digital subscription');
	const subscribeResponse = await createDigitalSubscription(zuoraClient);

	const subscriptionNumber = subscribeResponse[0]?.SubscriptionNumber;
	if (!subscriptionNumber) {
		throw new Error('SubscriptionNumber was undefined in response from Zuora');
	}

	console.log('Getting the subscription details from Zuora');
	const subscription = await getSubscription(
		stage,
		zuoraClient,
		subscriptionNumber,
	);

	console.log('Updating the subscription to trigger a price rise');
	const priceRisen = await doPriceRise(
		zuoraClient,
		subscription,
		nextBillingDate,
	);

	expect(priceRisen.success).toEqual(true);
}, 30000);
