import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { TargetInformation } from '../prepare/targetInformation';
import { PreviewOrderRequest } from '@modules/zuora/orders/orderRequests';
import dayjs, { type Dayjs } from 'dayjs';
import { getIfDefined } from '@modules/nullAndUndefined';
import { zuoraDateFormat } from '@modules/zuora/utils/common';
import { SubscriptionInformation } from '../prepare/subscriptionInformation';
import { Stage } from '@modules/stage';
import { SwitchOrderRequestBuilder } from '../prepare/buildSwitchOrderRequest';
import {
	doPreviewInvoices,
	ZuoraPreviewResponse,
	ZuoraPreviewResponseInvoice,
	ZuoraPreviewResponseInvoiceItem,
} from '../../doPreviewInvoices';

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
	chargedThroughDate: Dayjs | undefined,
	currentDate: Dayjs,
): boolean => {
	// FIXME think about what happens if someone switches T1->2->3 within a month?
	return (
		chargedThroughDate !== undefined && !currentDate.isSame(chargedThroughDate)
	);
};

export const getContributionRefundAmount = (
	zuoraPreviewInvoice: ZuoraPreviewResponseInvoice,
	sourceChargeIds: [string, ...string[]],
	chargedThroughDate?: Dayjs,
): number => {
	const contributionRefundAmount = zuoraPreviewInvoice.invoiceItems
		.filter((invoiceItem: ZuoraPreviewResponseInvoiceItem) =>
			sourceChargeIds.includes(invoiceItem.productRatePlanChargeId),
		)
		.reduceRight(
			(accu, invoiceItem) =>
				accu + invoiceItem.amountWithoutTax + invoiceItem.taxAmount,
			0,
		);
	if (
		contributionRefundAmount == undefined &&
		refundExpected(chargedThroughDate, dayjs())
	) {
		throw Error('No contribution refund amount found in the preview response');
	}

	return contributionRefundAmount ?? 0;
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

	const contributionRefundAmount = getContributionRefundAmount(
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
		contributionRefundAmount,
		supporterPlusPurchaseAmount:
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
