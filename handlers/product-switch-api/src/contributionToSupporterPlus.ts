import { checkDefined } from '@modules/nullAndUndefined';
import { prettyPrint } from '@modules/prettyPrint';
import type {
	ProductCatalog,
	ProductCurrency,
} from '@modules/product-catalog/productCatalog';
import { isValidProductCurrency } from '@modules/product-catalog/productCatalog';
import { zuoraDateFormat } from '@modules/zuora/common';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type {
	RatePlan,
	ZuoraSubscription,
	ZuoraSuccessResponse,
} from '@modules/zuora/zuoraSchemas';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { CatalogInformation } from './helpers';
import { getCatalogInformation, getFirstContributionRatePlan } from './helpers';
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

const getCurrency = (
	contributionRatePlan: RatePlan,
): ProductCurrency<'SupporterPlus'> => {
	const currency = checkDefined(
		contributionRatePlan.ratePlanCharges[0]?.currency,
		'No currency found on the rate plan charge',
	);

	if (isValidProductCurrency('SupporterPlus', currency)) {
		return currency;
	}
	throw new Error(`Unsupported currency ${currency}`);
};

export const switchToSupporterPlus = async (
	zuoraClient: ZuoraClient,
	productCatalog: ProductCatalog,
	subscription: ZuoraSubscription,
	body: string,
) => {
	const input = productSwitchRequestSchema.parse(JSON.parse(body));
	const contributionRatePlan = getFirstContributionRatePlan(
		productCatalog,
		subscription,
	);

	const billingPeriod = checkDefined(
		contributionRatePlan.ratePlanCharges[0]?.billingPeriod,
		`No rate plan charge found on the rate plan ${prettyPrint(
			contributionRatePlan,
		)}`,
	);
	const currency = getCurrency(contributionRatePlan);

	const catalogInformation = getCatalogInformation(
		productCatalog,
		billingPeriod,
		currency,
	);

	const contributionAmount =
		input.price - catalogInformation.supporterPlusPrice;

	if (input.preview) {
		return await preview(
			zuoraClient,
			subscription.accountNumber,
			subscription.subscriptionNumber,
			contributionAmount,
			catalogInformation,
		);
	} else {
		return await doSwitch(
			zuoraClient,
			subscription.accountNumber,
			subscription.subscriptionNumber,
			contributionAmount,
			catalogInformation,
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
	contributionAmount: number,
	catalogInformation: CatalogInformation,
): Promise<PreviewResponse> => {
	const requestBody = buildRequestBody(
		dayjs(),
		accountNumber,
		subscriptionNumber,
		contributionAmount,
		catalogInformation,
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
			catalogInformation.contributionChargeId,
			catalogInformation.supporterPlusChargeId,
		);
	} else {
		throw new Error(zuoraResponse.reasons?.[0]?.message ?? 'Unknown error');
	}
};
export const doSwitch = async (
	zuoraClient: ZuoraClient,
	accountNumber: string,
	subscriptionNumber: string,
	contributionAmount: number,
	catalogInformation: CatalogInformation,
): Promise<ZuoraSuccessResponse> => {
	const requestBody = buildRequestBody(
		dayjs(),
		accountNumber,
		subscriptionNumber,
		contributionAmount,
		catalogInformation,
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
	contributionAmount: number,
	catalogInformation: CatalogInformation,
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
							productRatePlanId:
								catalogInformation.contributionProductRatePlanId,
							subType: 'Upgrade',
							newProductRatePlan: {
								productRatePlanId:
									catalogInformation.supporterPlusProductRatePlanId,
								chargeOverrides: [
									{
										productRatePlanChargeId:
											catalogInformation.contributionChargeId,
										pricing: {
											recurringFlatFee: {
												listPrice: contributionAmount,
											},
										},
									},
								],
							},
						},
					},
				],
			},
		],
	};
};
