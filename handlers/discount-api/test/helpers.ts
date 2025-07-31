import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { Dayjs } from 'dayjs';
import { zuoraResponseSchema } from '../../../modules/zuora/src/types/httpResponse';
import type { ZuoraResponse } from '../../../modules/zuora/src/types/httpResponse';
import type { ZuoraSubscription } from '../../../modules/zuora/src/types/objects/subscription';
import { updateSubscriptionBody } from './fixtures/request-bodies/update-subscription-body';

export const doPriceRise = async (
	zuoraClient: ZuoraClient,
	subscription: ZuoraSubscription,
	contractEffectiveDate: Dayjs,
): Promise<ZuoraResponse> => {
	const path = `/v1/subscriptions/${subscription.subscriptionNumber}`;
	const ratePlanId = subscription.ratePlans[0]?.id;
	if (!ratePlanId) {
		throw new Error('RatePlanId was undefined in response from Zuora');
	}
	const body = JSON.stringify(
		updateSubscriptionBody(contractEffectiveDate, ratePlanId),
	);
	return zuoraClient.put(path, body, zuoraResponseSchema);
};
