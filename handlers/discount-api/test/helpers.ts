import type { ZuoraClient } from '@modules/zuora/src/zuoraClient';
import type {
	ZuoraSubscribeResponse,
	ZuoraSubscription,
	ZuoraSuccessResponse,
} from '@modules/zuora/src/zuoraSchemas';
import {
	zuoraSubscribeResponseSchema,
	zuoraSuccessResponseSchema,
} from '@modules/zuora/src/zuoraSchemas';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { digiSubSubscribeBody } from './fixtures/request-bodies/digitalSub-subscribe-body-old-price';
import { updateSubscriptionBody } from './fixtures/request-bodies/update-subscription-body';

export const createDigitalSubscription = async (
	zuoraClient: ZuoraClient,
	createWithOldPrice: boolean,
): Promise<ZuoraSubscribeResponse> => {
	const path = `/v1/action/subscribe`;
	const body = JSON.stringify(
		digiSubSubscribeBody(dayjs(), createWithOldPrice),
	);

	return zuoraClient.post(path, body, zuoraSubscribeResponseSchema);
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
