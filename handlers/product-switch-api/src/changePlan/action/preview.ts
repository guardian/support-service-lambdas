import { getIfDefined } from '@modules/nullAndUndefined';
import type { Stage } from '@modules/stage';
import type { PreviewOrderRequest } from '@modules/zuora/orders/orderRequests';
import { zuoraDateFormat } from '@modules/zuora/utils/common';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs, { type Dayjs } from 'dayjs';
import type {
	ZuoraPreviewResponse,
	ZuoraPreviewResponseInvoice,
	ZuoraPreviewResponseInvoiceItem,
} from '../../doPreviewInvoices';
import { doPreviewInvoices } from '../../doPreviewInvoices';
import type { SwitchOrderRequestBuilder } from '../prepare/buildSwitchOrderRequest';
import type { SubscriptionInformation } from '../prepare/subscriptionInformation';
import type { TargetInformation } from '../prepare/targetInformation';

export type PreviewResponse = {
	amountPayableToday: number;
	proratedRefundAmount: number;
	targetCatalogPrice: number;
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
	chargedThroughDate: Dayjs | undefined,
	currentDate: Dayjs,
): boolean => {
	return (
		chargedThroughDate !== undefined && !currentDate.isSame(chargedThroughDate)
	);
};

export const getRefundAmount = (
	zuoraPreviewInvoice: ZuoraPreviewResponseInvoice,
	sourceChargeIds: [string, ...string[]],
	chargedThroughDate?: Dayjs,
): number => {
	const sourceSubscriptionReversalItems =
		zuoraPreviewInvoice.invoiceItems.filter(
			(invoiceItem: ZuoraPreviewResponseInvoiceItem) =>
				sourceChargeIds.includes(invoiceItem.productRatePlanChargeId),
		);
	const contributionRefundAmount = sourceSubscriptionReversalItems.reduceRight(
		(accu, invoiceItem) =>
			accu - (invoiceItem.amountWithoutTax + invoiceItem.taxAmount),
		0,
	);
	if (
		sourceSubscriptionReversalItems.length === 0 &&
		refundExpected(chargedThroughDate, dayjs())
	) {
		throw Error(
			'No refund amount for the old subscription found in the preview response',
		);
	}

	return contributionRefundAmount;
};

export const previewResponseFromZuoraResponse = (
	stage: Stage,
	zuoraResponse: ZuoraPreviewResponse,
	targetInformation: TargetInformation,
	sourceProductChargeIds: [string, ...string[]],
	chargedThroughDate?: Dayjs,
): PreviewResponse => {
	const invoice: ZuoraPreviewResponseInvoice = getIfDefined(
		zuoraResponse.previewResult?.invoices[0],
		'No invoice found in the preview response',
	);

	const proratedRefundAmount = getRefundAmount(
		invoice,
		sourceProductChargeIds,
		chargedThroughDate,
	);

	const supporterPlusSubscriptionInvoiceItem = getIfDefined(
		invoice.invoiceItems.find(
			(invoiceItem: ZuoraPreviewResponseInvoiceItem) =>
				targetInformation.subscriptionChargeId ===
				invoiceItem.productRatePlanChargeId,
		),
		'No supporter plus invoice item found in the preview response: id: ' +
			targetInformation.subscriptionChargeId,
	);

	const supporterPlusContributionItem = getIfDefined(
		invoice.invoiceItems.find(
			(invoiceItem) =>
				invoiceItem.productRatePlanChargeId ===
				targetInformation.contributionCharge?.id,
		),
		'No supporter plus invoice item found in the preview response: id: ' +
			targetInformation.contributionCharge?.id,
	);

	const response: PreviewResponse = {
		amountPayableToday: invoice.amount,
		proratedRefundAmount,
		targetCatalogPrice:
			supporterPlusSubscriptionInvoiceItem.unitPrice +
			supporterPlusContributionItem.unitPrice,
		nextPaymentDate: zuoraDateFormat(
			dayjs(supporterPlusSubscriptionInvoiceItem.serviceEndDate).add(1, 'days'),
		),
	};

	const possibleDiscount = targetInformation.discount;
	if (possibleDiscount) {
		const discountInvoiceItem = invoice.invoiceItems.find(
			(invoiceItem) =>
				invoiceItem.productRatePlanChargeId ===
				possibleDiscount.productRatePlanChargeId[stage],
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

export class DoPreviewAction {
	constructor(
		private zuoraClient: ZuoraClient,
		private stage: Stage,
		private today: Dayjs,
	) {}

	preview = async (
		subscriptionInformation: SubscriptionInformation,
		targetInformation: TargetInformation,
		orderRequest: SwitchOrderRequestBuilder,
	): Promise<PreviewResponse> => {
		const requestBody: PreviewOrderRequest = {
			previewOptions: {
				previewThruType: 'SpecificDate',
				previewTypes: ['BillingDocs'],
				specificPreviewThruDate: zuoraDateFormat(this.today),
			},
			...orderRequest.build(this.today),
		};
		const zuoraResponse: ZuoraPreviewResponse = await doPreviewInvoices(
			this.zuoraClient,
			requestBody,
		);
		return previewResponseFromZuoraResponse(
			this.stage,
			zuoraResponse,
			targetInformation,
			subscriptionInformation.chargeIds,
			subscriptionInformation.chargedThroughDate,
		);
	};
}
