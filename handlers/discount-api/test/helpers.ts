import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { ZuoraClient } from '../src/zuora/zuoraClient';
import type {
	ZuoraSubscribeResponse,
	ZuoraSubscription,
	ZuoraSuccessResponse,
} from '../src/zuora/zuoraSchemas';
import {
	zuoraSubscribeResponseSchema,
	zuoraSuccessResponseSchema,
} from '../src/zuora/zuoraSchemas';
import { digiSubSubscribeBody } from './fixtures/request-bodies/digitalSub-subscribe-body-old-price';
import { updateSubscriptionBody } from './fixtures/request-bodies/update-subscription-body';

export const createDigitalSubscription = async (
	zuoraClient: ZuoraClient,
	createWithOldPrice: boolean,
) => {
	const path = `/v1/action/subscribe`;
	const body = JSON.stringify(
		digiSubSubscribeBody(dayjs(), createWithOldPrice),
	);

	return zuoraClient.post<ZuoraSubscribeResponse>(
		path,
		body,
		zuoraSubscribeResponseSchema,
	);
};

export const doPriceRise = async (
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
