import type { Dayjs } from 'dayjs';
import { zuoraDateFormat } from './common';
import type { ZuoraClient } from './zuoraClient';
import type { ZuoraSuccessResponse } from './zuoraSchemas';
import { zuoraSuccessResponseSchema } from './zuoraSchemas';

export const cancelSubscription = async (
	zuoraClient: ZuoraClient,
	subscriptionNumber: string,
	contractEffectiveDate: Dayjs,
	runBilling: boolean,
	collect: boolean | undefined = undefined,
): Promise<ZuoraSuccessResponse> => {
	const path = `/v1/subscriptions/${subscriptionNumber}/cancel`;
	const body = JSON.stringify({
		cancellationEffectiveDate: zuoraDateFormat(contractEffectiveDate),
		cancellationPolicy: 'SpecificDate',
		runBilling,
		collect,
	});
	return zuoraClient.put(path, body, zuoraSuccessResponseSchema, {
		'zuora-version': '211.0',
	});
};
