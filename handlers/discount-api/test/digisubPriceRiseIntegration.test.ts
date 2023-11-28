/**
 * Creates test subscriptions in various state to test the price rise logic
 *
 * @group integration
 */

import dayjs from 'dayjs';
import { BearerTokenProvider } from '../src/zuora/bearerTokenProvider';
import { zuoraServerUrl } from '../src/zuora/common';
import { getOAuthClientCredentials } from '../src/zuora/oAuthCredentials';
import { zuoraSubscribeResponseSchema } from '../src/zuora/zuoraSchemas';
import { digisubSubscribeBody } from './fixtures/digisub-subscribe-body';

const createPriceRiseSubscription = async () => {
	const stage = 'CODE';
	const url = `${zuoraServerUrl(stage)}/v1/action/subscribe`;
	const credentials = await getOAuthClientCredentials(stage);
	const bearerToken = await new BearerTokenProvider(
		stage,
		credentials,
	).getBearerToken();
	const body = JSON.stringify(digisubSubscribeBody(dayjs()));
	console.log(`POST to ${url} with body ${body}`);
	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${bearerToken.access_token}`,
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

test('createPriceRiseSubscription', async () => {
	const subscribeResponse = await createPriceRiseSubscription();
	expect(subscribeResponse.length).toEqual(1);
});
