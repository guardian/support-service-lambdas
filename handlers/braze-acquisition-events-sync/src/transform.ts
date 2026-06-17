import type { AcquisitionDataRow } from './acquisitionEvent';
import type { BrazeTrackPayload } from './brazeClient';

const productNameMap: Partial<Record<AcquisitionDataRow['product'], string>> = {
	CONTRIBUTION: 'Single Contribution',
	RECURRING_CONTRIBUTION: 'Recurring Contribution',
	SUPPORTER_PLUS: 'Supporter Plus',
	DIGITAL_SUBSCRIPTION: 'Digital Subscription',
	TIER_THREE: 'Tier Three',
	GUARDIAN_AD_LITE: 'Guardian Ad-Lite',
	APP_PREMIUM_TIER: 'Premium App',
	FEAST_APP: 'Feast App',
};

const paymentFrequencyMap: Partial<
	Record<AcquisitionDataRow['paymentFrequency'], string>
> = {
	ONE_OFF: 'One-off payment',
	MONTHLY: 'Month',
	QUARTERLY: 'Quarter',
	SIX_MONTHLY: 'Semi-Annual',
	ANNUALLY: 'Annual',
	ANNUAL: 'Annual',
};

function mapProductName(event: AcquisitionDataRow): string {
	if (event.product === 'PRINT_SUBSCRIPTION') {
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

	return productNameMap[event.product] ?? event.product;
}

function mapPaymentFrequency(
	paymentFrequency: AcquisitionDataRow['paymentFrequency'],
): string {
	return paymentFrequencyMap[paymentFrequency] ?? paymentFrequency;
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
