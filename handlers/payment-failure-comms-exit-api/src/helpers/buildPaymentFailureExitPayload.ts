import { paymentFailureCommsExitEventName } from '../constants';
import type { BrazeTrackPayload } from '../types';

export const buildPaymentFailureExitPayload = (
	brazeUuid: string,
	appId: string,
	time: string,
): BrazeTrackPayload => ({
	events: [
		{
			external_id: brazeUuid,
			app_id: appId,
			name: paymentFailureCommsExitEventName,
			time,
			_update_existing_only: true,
		},
	],
});
