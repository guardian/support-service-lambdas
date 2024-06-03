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
		runBilling,// for some reason zuora chokes on this here but not when pasted into postman?
		collect,
	});
	return zuoraClient.put(path, body, zuoraSuccessResponseSchema);
};
