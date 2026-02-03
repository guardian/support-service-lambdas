import { groupByUniqueId } from '@modules/arrayFunctions';
import { getIfDefined, mapOption } from '@modules/nullAndUndefined';
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

export const isRefundExpected = (
	chargedThroughDate: Dayjs | undefined,
	currentDate: Dayjs,
): boolean => {
	return (
		chargedThroughDate !== undefined && !currentDate.isSame(chargedThroughDate)
	);
};

export const getRefundAmountMinorUnits = (
	itemsById: Record<string, ZuoraPreviewResponseInvoiceItem>,
	sourceChargeIds: [string, ...string[]],
	chargedThroughDate?: Dayjs,
): number => {
	const sourceSubscriptionReversalItems = sourceChargeIds.flatMap((id) =>
		itemsById[id] !== undefined ? [itemsById[id]] : [],
	);
	const refundExpected = isRefundExpected(chargedThroughDate, dayjs());
	if (
		sourceSubscriptionReversalItems.length !== sourceChargeIds.length &&
		(sourceSubscriptionReversalItems.length !== 0 || refundExpected)
	) {
		throw Error(
			`Did not find a refund for every charge in the old subscription in the preview response: expected: ${JSON.stringify(sourceChargeIds)}`,
		);
	}

	const contributionRefundAmount = sourceSubscriptionReversalItems.reduce(
		(accu, invoiceItem) => accu - invoiceItem.amountMinorUnits,
		0,
	);

	return contributionRefundAmount;
};

export const previewResponseFromZuoraResponse = (
	stage: Stage,
	invoice: ZuoraPreviewResponseInvoice,
	targetInformation: TargetInformation,
	sourceProductChargeIds: [string, ...string[]],
	chargedThroughDate?: Dayjs,
): PreviewResponse => {
	const itemsById: Record<string, ZuoraPreviewResponseInvoiceItem> =
		groupByUniqueId(
			invoice.invoiceItems,
			(item) => item.productRatePlanChargeId,
			'duplicate productRatePlanChargeId in the same invoice',
		);

	const proratedRefundAmount = getRefundAmountMinorUnits(
		itemsById,
		sourceProductChargeIds,
		chargedThroughDate,
	);

	const targetBaseInvoiceItem = getIfDefined(
		itemsById[targetInformation.subscriptionChargeId],
		'No supporter plus invoice item found in the preview response: id: ' +
			targetInformation.subscriptionChargeId,
	);

	const targetContributionUnitPrice = mapOption(
		targetInformation.contributionCharge?.id,
		(contributionChargeId) =>
			getIfDefined(
				itemsById[contributionChargeId],
				'No supporter plus invoice item found in the preview response: id: ' +
					contributionChargeId,
			).unitPriceMinorUnits,
	);

	const maybeDiscount: SwitchDiscountResponse | undefined = mapOption(
		targetInformation.discount,
		(possibleDiscount) =>
			mapOption(
				itemsById[possibleDiscount.productRatePlanChargeId[stage]],
				(discountInvoiceItem) =>
					({
						discountedPrice:
							(targetBaseInvoiceItem.unitPriceMinorUnits +
								discountInvoiceItem.amountMinorUnits) /
							100,
						discountPercentage: possibleDiscount.discountPercentage,
						upToPeriods: possibleDiscount.upToPeriods,
						upToPeriodsType: possibleDiscount.upToPeriodsType,
					}) satisfies SwitchDiscountResponse,
			),
	);

	const response: PreviewResponse = {
		amountPayableToday: invoice.amount,
		proratedRefundAmount: proratedRefundAmount / 100,
		targetCatalogPrice:
			(targetBaseInvoiceItem.unitPriceMinorUnits +
				(targetContributionUnitPrice ?? 0)) /
			100,
		nextPaymentDate: zuoraDateFormat(
			dayjs(targetBaseInvoiceItem.serviceEndDate).add(1, 'days'),
		),
		...(maybeDiscount === undefined ? {} : { discount: maybeDiscount }),
	};

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
			zuoraResponse.previewResult.invoices[0],
			targetInformation,
			subscriptionInformation.chargeIds,
			subscriptionInformation.chargedThroughDate,
		);
	};
}
