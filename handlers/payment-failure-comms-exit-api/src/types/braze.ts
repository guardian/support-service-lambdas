import type { paymentFailureCommsExitEventName } from '../constants';

export type BrazeTrackPayload = {
	events: Array<{
		external_id: string;
		app_id: string;
		name: typeof paymentFailureCommsExitEventName;
		time: string;
		_update_existing_only: true;
	}>;
};
