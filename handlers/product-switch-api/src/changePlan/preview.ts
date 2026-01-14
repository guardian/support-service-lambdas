import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { SwitchInformation } from './switchInformation';
import {
	previewOrderRequest,
	PreviewOrderRequest,
} from '@modules/zuora/orders/orderRequests';
import dayjs, { type Dayjs } from 'dayjs';
import {
	ZuoraPreviewResponse,
	type ZuoraPreviewResponseInvoice,
	type ZuoraPreviewResponseInvoiceItem,
	zuoraPreviewResponseSchema,
} from '../schemas';
import type { CatalogInformation } from '../catalogInformation';
import type { Discount } from '../discounts';
import { getIfDefined } from '@modules/nullAndUndefined';
import { buildSwitchRequestWithoutOptions } from './buildSwitchOrderRequest';
import {
	RatePlan,
	RatePlanCharge,
	ZuoraSubscription,
} from '@modules/zuora/types/objects/subscription';
import { zuoraDateFormat } from '@modules/zuora/utils/common';
import { distinct, getSingleOrThrow } from '@modules/arrayFunctions';

export type PreviewResponse = {
	amountPayableToday: number;
	contributionRefundAmount: number;
	supporterPlusPurchaseAmount: number;
	nextPaymentDate: string;
	discount?: SwitchDiscountResponse;
};

export interface SwitchDiscountResponse {
	discountedPrice: number;
	upToPeriods: number;
	upToPeriodsType: 'Months' | 'Years';
	discountPercentage: number;
}

export const refundExpected = (
	catalogInformation: CatalogInformation,
	subscription: ZuoraSubscription,
	currentDate: Date,
): boolean => {
	const ratePlan = getIfDefined(
		subscription.ratePlans.find(
			(ratePlan: RatePlan) =>
				ratePlan.productRatePlanId ===
				catalogInformation.sourceProduct.productRatePlanId,
		),
		'No matching RatePlan found in Subscription,',
	);

	const sourceCharges = ratePlan.ratePlanCharges.filter((ratePlanCharge) =>
		catalogInformation.sourceProduct.chargeIds.includes(
			ratePlanCharge.productRatePlanChargeId,
		),
	);
	const chargedThroughDates = sourceCharges.flatMap(
		(ratePlanCharge: RatePlanCharge) =>
			ratePlanCharge.chargedThroughDate !== null
				? [ratePlanCharge.chargedThroughDate]
				: [],
	);
	const chargedThroughDate: Date = getSingleOrThrow(
		distinct(chargedThroughDates),
		(msg) =>
			new Error(
				"couldn't extract a chargedThroughDate from the charges: " + msg,
			),
	);

	return currentDate.toDateString() !== chargedThroughDate.toDateString();
};

export const getContributionRefundAmount = (
	zuoraPreviewInvoice: ZuoraPreviewResponseInvoice,
	catalogInformation: CatalogInformation,
	subscription: ZuoraSubscription,
): number => {
	const contributionRefundAmount = zuoraPreviewInvoice.invoiceItems
		.filter((invoiceItem: ZuoraPreviewResponseInvoiceItem) =>
			catalogInformation.sourceProduct.chargeIds.includes(
				invoiceItem.productRatePlanChargeId,
			),
		)
		.reduceRight(
			(accu, invoiceItem) =>
				accu + invoiceItem.amountWithoutTax + invoiceItem.taxAmount,
			0,
		);
	if (
		contributionRefundAmount == undefined &&
		refundExpected(catalogInformation, subscription, new Date())
	) {
		throw Error('No contribution refund amount found in the preview response');
	}

	return contributionRefundAmount ?? 0;
};

export const previewResponseFromZuoraResponse = (
	zuoraResponse: ZuoraPreviewResponse,
	catalogInformation: CatalogInformation,
	subscription: ZuoraSubscription,
	possibleDiscount?: Discount,
): PreviewResponse => {
	const invoice: ZuoraPreviewResponseInvoice = getIfDefined(
		zuoraResponse.previewResult?.invoices[0],
		'No invoice found in the preview response',
	);

	const contributionRefundAmount = getContributionRefundAmount(
		invoice,
		catalogInformation,
		subscription,
	);

	const supporterPlusSubscriptionInvoiceItem = getIfDefined(
		invoice.invoiceItems.find(
			(invoiceItem: ZuoraPreviewResponseInvoiceItem) =>
				invoiceItem.productRatePlanChargeId ===
				catalogInformation.targetProduct.subscriptionChargeId,
		),
		'No supporter plus invoice item found in the preview response: id: ' +
			catalogInformation.targetProduct.subscriptionChargeId,
	);

	const supporterPlusContributionItem = getIfDefined(
		invoice.invoiceItems.find(
			(invoiceItem) =>
				invoiceItem.productRatePlanChargeId ===
				catalogInformation.targetProduct.contributionChargeId,
		),
		'No supporter plus invoice item found in the preview response: id: ' +
			catalogInformation.targetProduct.contributionChargeId,
	);

	const response: PreviewResponse = {
		amountPayableToday: invoice.amount,
		contributionRefundAmount,
		supporterPlusPurchaseAmount:
			supporterPlusSubscriptionInvoiceItem.unitPrice +
			supporterPlusContributionItem.unitPrice,
		nextPaymentDate: zuoraDateFormat(
			dayjs(supporterPlusSubscriptionInvoiceItem.serviceEndDate).add(1, 'days'),
		),
	};

	if (possibleDiscount) {
		const discountInvoiceItem = invoice.invoiceItems.find(
			(invoiceItem) =>
				invoiceItem.productRatePlanChargeId ===
				possibleDiscount.productRatePlanChargeId,
		);
		if (discountInvoiceItem) {
			response.discount = {
				discountedPrice:
					supporterPlusSubscriptionInvoiceItem.unitPrice +
					(discountInvoiceItem.amountWithoutTax +
						discountInvoiceItem.taxAmount),
				discountPercentage: possibleDiscount.discountPercentage,
				upToPeriods: possibleDiscount.upToPeriods,
				upToPeriodsType: possibleDiscount.upToPeriodsType,
			};
		}
	}

	return response;
};
export const preview = async (
	zuoraClient: ZuoraClient,
	productSwitchInformation: SwitchInformation,
	subscription: ZuoraSubscription,
): Promise<PreviewResponse> => {
	const requestBody: PreviewOrderRequest = buildPreviewRequestBody(
		dayjs(),
		productSwitchInformation,
	);
	const zuoraResponse: ZuoraPreviewResponse = await previewOrderRequest(
		zuoraClient,
		requestBody,
		zuoraPreviewResponseSchema,
	);
	return previewResponseFromZuoraResponse(
		zuoraResponse,
		productSwitchInformation.catalog,
		subscription,
		productSwitchInformation.discount,
	);
};
const buildPreviewRequestBody = (
	orderDate: Dayjs,
	productSwitchInformation: SwitchInformation,
): PreviewOrderRequest => {
	return {
		previewOptions: {
			previewThruType: 'SpecificDate',
			previewTypes: ['BillingDocs'],
			specificPreviewThruDate: zuoraDateFormat(orderDate),
		},
		...buildSwitchRequestWithoutOptions(
			productSwitchInformation,
			orderDate,
			true,
		),
	};
};
