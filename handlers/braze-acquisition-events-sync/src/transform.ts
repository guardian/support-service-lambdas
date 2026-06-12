import type { AcquisitionDataRow } from './acquisitionEvent';
import type { BrazeTrackPayload } from './brazeClient';

export function transformEventForBrazePayload(
	event: AcquisitionDataRow,
	externalId: string,
): BrazeTrackPayload {
	return {
		events: [
			{
				external_id: externalId,
				name: 'acquisition',
				time: event.eventTimeStamp,
				_update_existing_only: true,
				properties: {
					product_name: event.product,
					currency: event.currency,
					promo_code: event.promoCode,
					payment_frequency: event.paymentFrequency,
					transaction_value: event.amount,
				},
			},
		],
	};
}
