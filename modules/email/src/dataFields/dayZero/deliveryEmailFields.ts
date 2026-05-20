import { getCountryNameByIsoCode } from '@modules/internationalisation/country';
import type { IsoCurrency } from '@modules/internationalisation/currency';
import type { Dayjs } from 'dayjs';
import type { NonDeliveryEmailFields } from './emailFields';
import { buildNonDeliveryEmailFields } from './emailFields';
import type {
	EmailBillingPeriod,
	EmailPaymentMethod,
	EmailPaymentSchedule,
	EmailUser,
} from './types';

type DeliveryFields = {
	delivery_address_line_1: string;
	delivery_address_line_2: string;
	delivery_address_town: string;
	delivery_postcode: string;
	delivery_country: string;
};

type DeliveryEmailFields = NonDeliveryEmailFields & DeliveryFields;

export function buildDeliveryEmailFields({
	today,
	user,
	subscriptionNumber,
	currency,
	billingPeriod,
	paymentMethod,
	paymentSchedule,
	isFixedTerm,
	mandateId,
}: {
	today: Dayjs;
	user: EmailUser;
	subscriptionNumber: string;
	currency: IsoCurrency;
	billingPeriod: EmailBillingPeriod;
	paymentMethod: EmailPaymentMethod;
	paymentSchedule: EmailPaymentSchedule;
	isFixedTerm: boolean;
	mandateId?: string;
}): DeliveryEmailFields {
	const nonDeliveryFields: NonDeliveryEmailFields = buildNonDeliveryEmailFields(
		{
			today: today,
			user: user,
			subscriptionNumber: subscriptionNumber,
			currency: currency,
			billingPeriod: billingPeriod,
			paymentMethod: paymentMethod,
			paymentSchedule: paymentSchedule,
			isFixedTerm: isFixedTerm,
			mandateId: mandateId,
		},
	);

	const address = user.deliveryAddress ?? user.billingAddress;
	const deliveryFields = {
		delivery_address_line_1: address.lineOne ?? '',
		delivery_address_line_2: address.lineTwo ?? '',
		delivery_address_town: address.city ?? '',
		delivery_postcode: address.postCode ?? '',
		delivery_country: getCountryNameByIsoCode(address.country) ?? '',
	};

	return {
		...nonDeliveryFields,
		...deliveryFields,
	};
}
