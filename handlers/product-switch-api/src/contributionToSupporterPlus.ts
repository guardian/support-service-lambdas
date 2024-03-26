import { checkDefined } from '@modules/nullAndUndefined';
import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import { zuoraDateFormat } from '@modules/zuora/common';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type {
	ZuoraSubscription,
	ZuoraSuccessResponse,
} from '@modules/zuora/zuoraSchemas';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { CatalogIds } from './helpers';
import { getBillingPeriodFromSubscription, getCatalogIds } from './helpers';
import type { ZuoraPreviewResponse, ZuoraSwitchResponse } from './schemas';
import {
	productSwitchRequestSchema,
	zuoraPreviewResponseSchema,
	zuoraSwitchResponseSchema,
} from './schemas';

export type PreviewResponse = {
	amountPayableToday: number;
	contributionRefundAmount: number;
	supporterPlusPurchaseAmount: number;
	nextPaymentDate: string;
};

export const switchToSupporterPlus = async (
	zuoraClient: ZuoraClient,
	productCatalog: ProductCatalog,
	subscription: ZuoraSubscription,
	body: string,
) => {
	const input = productSwitchRequestSchema.parse(JSON.parse(body));
	const billingPeriod = getBillingPeriodFromSubscription(
		productCatalog,
		subscription,
	);
	const catalogIds = getCatalogIds(productCatalog, billingPeriod);

	if (input.preview) {
		return await preview(
			zuoraClient,
			subscription.accountNumber,
			subscription.subscriptionNumber,
			catalogIds,
		);
	} else {
		return await doSwitch(
			zuoraClient,
			subscription.accountNumber,
			subscription.subscriptionNumber,
			catalogIds.contributionProductRatePlanId,
			catalogIds.supporterPlusProductRatePlanId,
		);
	}
};

export const previewResponseFromZuoraResponse = (
	zuoraResponse: ZuoraPreviewResponse,
	contributionChargeId: string,
	supporterPlusChargeId: string,
): PreviewResponse => {
	const invoice = checkDefined(
		zuoraResponse.previewResult?.invoices[0],
		'No invoice found in the preview response',
	);
	const contributionRefundAmount = checkDefined(
		invoice.invoiceItems.find(
			(invoiceItem) =>
				invoiceItem.productRatePlanChargeId === contributionChargeId,
		)?.amountWithoutTax,
		'No contribution refund amount found in the preview response',
	);

	const supporterPlusInvoiceItem = checkDefined(
		invoice.invoiceItems.find(
			(invoiceItem) =>
				invoiceItem.productRatePlanChargeId === supporterPlusChargeId,
		),
		'No supporter plus invoice item found in the preview response',
	);

	return {
		amountPayableToday: invoice.amount,
		contributionRefundAmount,
		supporterPlusPurchaseAmount: supporterPlusInvoiceItem.unitPrice,
		nextPaymentDate: zuoraDateFormat(
			dayjs(supporterPlusInvoiceItem.serviceEndDate).add(1, 'days'),
		),
	};
};
export const preview = async (
	zuoraClient: ZuoraClient,
	accountNumber: string,
	subscriptionNumber: string,
	catalogIds: CatalogIds,
): Promise<PreviewResponse> => {
	const requestBody = buildRequestBody(
		dayjs(),
		accountNumber,
		subscriptionNumber,
		catalogIds.contributionProductRatePlanId,
		catalogIds.supporterPlusProductRatePlanId,
		true,
	);
	const zuoraResponse: ZuoraPreviewResponse = await zuoraClient.post(
		'v1/orders/preview',
		JSON.stringify(requestBody),
		zuoraPreviewResponseSchema,
	);
	if (zuoraResponse.success) {
		return previewResponseFromZuoraResponse(
			zuoraResponse,
			catalogIds.contributionChargeId,
			catalogIds.supporterPlusChargeId,
		);
	} else {
		throw new Error(zuoraResponse.reasons?.[0]?.message ?? 'Unknown error');
	}
};
export const doSwitch = async (
	zuoraClient: ZuoraClient,
	accountNumber: string,
	subscriptionNumber: string,
	contributionProductRatePlanId: string,
	supporterPlusProductRatePlanId: string,
): Promise<ZuoraSuccessResponse> => {
	const requestBody = buildRequestBody(
		dayjs(),
		accountNumber,
		subscriptionNumber,
		contributionProductRatePlanId,
		supporterPlusProductRatePlanId,
		false,
	);
	const zuoraResponse: ZuoraSwitchResponse = await zuoraClient.post(
		'v1/orders',
		JSON.stringify(requestBody),
		zuoraSwitchResponseSchema,
	);
	if (zuoraResponse.success) {
		return zuoraResponse;
	} else {
		throw new Error(zuoraResponse.reasons?.[0]?.message ?? 'Unknown error');
	}
};

export const buildRequestBody = (
	orderDate: Dayjs,
	accountNumber: string,
	subscriptionNumber: string,
	productRatePlanToRemoveId: string,
	newProductRatePlanId: string,
	preview: boolean,
) => {
	const options = preview
		? {
				previewOptions: {
					previewThruType: 'SpecificDate',
					previewTypes: ['BillingDocs'],
					specificPreviewThruDate: zuoraDateFormat(orderDate),
				},
		  }
		: {
				processingOptions: {
					runBilling: true,
					collectPayment: true,
				},
		  };
	return {
		orderDate: zuoraDateFormat(orderDate),
		existingAccountNumber: accountNumber,
		...options,
		subscriptions: [
			{
				subscriptionNumber: subscriptionNumber,
				orderActions: [
					{
						type: 'ChangePlan',
						triggerDates: [
							{
								name: 'ContractEffective',
								triggerDate: zuoraDateFormat(orderDate),
							},
							{
								name: 'ServiceActivation',
								triggerDate: zuoraDateFormat(orderDate),
							},
							{
								name: 'CustomerAcceptance',
								triggerDate: zuoraDateFormat(orderDate),
							},
						],
						changePlan: {
							productRatePlanId: productRatePlanToRemoveId,
							subType: 'Upgrade',
							newProductRatePlan: {
								productRatePlanId: newProductRatePlanId,
							},
						},
					},
				],
			},
		],
	};
};
