import type { AcquisitionDataRow } from './acquisitionEvent';
import type { BrazeTrackPayload } from './brazeClient';

function mapProductName(event: AcquisitionDataRow): string {
	switch (event.product) {
		case 'CONTRIBUTION':
			return 'Single Contribution';
		case 'RECURRING_CONTRIBUTION':
			return 'Recurring Contribution';
		case 'SUPPORTER_PLUS':
			return 'Supporter Plus';
		case 'DIGITAL_SUBSCRIPTION':
			return 'Digital Subscription';
		case 'PRINT_SUBSCRIPTION': {
			if (
				event.printProduct === 'HOME_DELIVERY_SUNDAY' ||
				event.printProduct === 'VOUCHER_SUNDAY'
			) {
				return 'Newspaper - Subscription';
			}

			if (event.printProduct !== 'GUARDIAN_WEEKLY') {
				return 'Newspaper - Subscription';
			}

			return 'Guardian Weekly - Digital';
		}
		case 'TIER_THREE':
			return 'Tier Three';
		case 'GUARDIAN_AD_LITE':
			return 'Guardian Ad-Lite';
		case 'APP_PREMIUM_TIER':
			return 'Premium App';
		case 'FEAST_APP':
			return 'Feast App';
		default:
			return event.product;
	}
}

function mapPaymentFrequency(
	paymentFrequency: AcquisitionDataRow['paymentFrequency'],
): string {
	switch (paymentFrequency) {
		case 'ONE_OFF':
			return 'One-off payment';
		case 'MONTHLY':
			return 'Month';
		case 'QUARTERLY':
			return 'Quarter';
		case 'SIX_MONTHLY':
			return 'Semi-Annual';
		case 'ANNUALLY':
		case 'ANNUAL':
			return 'Annual';
		default:
			return paymentFrequency;
	}
}

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
					product_name: mapProductName(event),
					currency: event.currency,
					promo_code: event.promoCode,
					payment_frequency: mapPaymentFrequency(event.paymentFrequency),
					transaction_value: event.amount,
				},
			},
		],
	};
}
