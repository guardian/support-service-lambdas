import type { Dayjs } from 'dayjs';
import { DataExtensionNames } from '@modules/email/email';
import type {
	DataExtensionName,
	EmailMessageWithIdentityUserId,
} from '@modules/email/email';
import type { IsoCurrency } from '@modules/internationalisation/currency';
import type { ProductPurchase } from '@modules/product-catalog/productPurchaseSchema';
import { buildDeliveryEmailFields } from './deliveryEmailFields';
import { buildEmailFields } from './emailFields';
import type {
	EmailDeliveryAgentDetails,
	EmailPaymentMethod,
	EmailPaymentSchedule,
	EmailUser,
} from './types';

export type PaperProductPurchase = Extract<
	ProductPurchase,
	{ product: 'NationalDelivery' | 'HomeDelivery' | 'SubscriptionCard' }
>;

export function buildPaperEmailFields({
	today,
	user,
	currency,
	subscriptionNumber,
	paymentSchedule,
	paymentMethod,
	mandateId,
	productInformation,
	deliveryAgentDetails,
}: {
	today: Dayjs;
	user: EmailUser;
	currency: IsoCurrency;
	subscriptionNumber: string;
	paymentSchedule: EmailPaymentSchedule;
	paymentMethod: EmailPaymentMethod;
	mandateId?: string;
	productInformation: PaperProductPurchase;
	deliveryAgentDetails?: EmailDeliveryAgentDetails;
}): EmailMessageWithIdentityUserId {
	const deliveryAgentFields =
		productInformation.product === 'NationalDelivery' && deliveryAgentDetails
			? {
					delivery_agent_name: deliveryAgentDetails.agentname,
					delivery_agent_telephone: deliveryAgentDetails.telephone,
					delivery_agent_email: deliveryAgentDetails.email,
					delivery_agent_address1: deliveryAgentDetails.address1,
					delivery_agent_address2: deliveryAgentDetails.address2,
					delivery_agent_town: deliveryAgentDetails.town,
					delivery_agent_county: deliveryAgentDetails.county,
					delivery_agent_postcode: deliveryAgentDetails.postcode,
				}
			: undefined;

	const deliveryFields = buildDeliveryEmailFields({
		today: today,
		user: user,
		subscriptionNumber: subscriptionNumber,
		currency: currency,
		billingPeriod: 'Monthly', // Paper products are always monthly
		paymentMethod: paymentMethod,
		paymentSchedule: paymentSchedule,
		isFixedTerm: false, // There are no fixed term paper rate plans
		mandateId: mandateId,
	});
	const productFields = {
		package: productInformation.ratePlan,
		...deliveryAgentFields,
		...deliveryFields,
	};
	return buildEmailFields(
		user,
		getDataExtensionName(productInformation),
		productFields,
	);
}

function getDataExtensionName(
	productInformation: ProductPurchase,
): DataExtensionName {
	if (
		productInformation.product === 'HomeDelivery' &&
		productInformation.ratePlan === 'Sunday'
	) {
		return DataExtensionNames.day0Emails.homeDeliveryObserver;
	}
	if (
		productInformation.product === 'SubscriptionCard' &&
		productInformation.ratePlan === 'Sunday'
	) {
		return DataExtensionNames.day0Emails.subscriptionCardObserver;
	}
	if (productInformation.product === 'HomeDelivery') {
		return DataExtensionNames.day0Emails.homeDelivery;
	}
	if (productInformation.product === 'NationalDelivery') {
		return DataExtensionNames.day0Emails.nationalDelivery;
	}
	return DataExtensionNames.day0Emails.subscriptionCard;
}
