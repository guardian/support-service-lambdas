/**
 * Creates test subscriptions in various state to test the price rise logic
 *
 * @group integration
 */

import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { Stage } from '../../../modules/Stage';
import { BearerTokenProvider } from '../src/zuora/bearerTokenProvider';
import { zuoraServerUrl } from '../src/zuora/common';
import { GetSubscription } from '../src/zuora/getSubscription';
import { getOAuthClientCredentials } from '../src/zuora/oAuthCredentials';
import type {
	ZuoraSubscription,
	ZuoraSuccessResponse,
} from '../src/zuora/zuoraSchemas';
import {
	zuoraSubscribeResponseSchema,
	zuoraSuccessResponseSchema,
} from '../src/zuora/zuoraSchemas';
import { digiSubSubscribeBody } from './fixtures/digi-sub-subscribe-body';
import { updateSubscriptionBody } from './fixtures/update-subscription-body';

const stage: Stage = 'CODE';
const subscribeDate = dayjs().add(-3, 'weeks');
const nextBillingDate = subscribeDate.add(1, 'month');
const createDigitalSubscription = async (accessToken: string) => {
	const url = `${zuoraServerUrl(stage)}/v1/action/subscribe`;
	const body = JSON.stringify(digiSubSubscribeBody(subscribeDate));

	console.log(`POST to ${url} with body ${body}`);
	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
			body,
		});
		const json = await response.json();
		console.log('Response from Zuora was: ', json);
		return zuoraSubscribeResponseSchema.parse(json);
	} catch (error) {
		console.log('Error from Zuora was: ', error);
		throw error;
	}
};

const doPriceRise = async (
	accessToken: string,
	subscription: ZuoraSubscription,
	contractEffectiveDate: Dayjs,
): Promise<ZuoraSuccessResponse> => {
	const url = `${zuoraServerUrl(stage)}/v1/subscriptions/${
		subscription.subscriptionNumber
	}`;
	const ratePlanId = subscription.ratePlans[0]?.id;
	if (!ratePlanId) {
		throw new Error('RatePlanId was undefined in response from Zuora');
	}
	const body = JSON.stringify(
		updateSubscriptionBody(contractEffectiveDate, ratePlanId),
	);
	console.log(`PUT to ${url} with body ${body}`);
	try {
		const response = await fetch(url, {
			method: 'PUT',
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
			},
			body,
		});
		const json = await response.json();
		console.log('Response from Zuora was: ', json);
		return zuoraSuccessResponseSchema.parse(json);
	} catch (error) {
		console.log('Error from Zuora was: ', error);
		throw error;
	}
};

test('createPriceRiseSubscription', async () => {
	const credentials = await getOAuthClientCredentials(stage);
	const bearerTokenProvider = new BearerTokenProvider(stage, credentials);
	const bearerToken = await bearerTokenProvider.getBearerToken();

	const subscribeResponse = await createDigitalSubscription(
		bearerToken.access_token,
	);

	const subscriptionNumber = subscribeResponse[0]?.SubscriptionNumber;
	if (!subscriptionNumber) {
		throw new Error('SubscriptionNumber was undefined in response from Zuora');
	}

	const subscription = await new GetSubscription(
		stage,
		bearerTokenProvider,
	).getSubscription(subscriptionNumber);

	const priceRisen = await doPriceRise(
		bearerToken.access_token,
		subscription,
		nextBillingDate,
	);

	expect(priceRisen.success).toEqual(true);
}, 30000);
