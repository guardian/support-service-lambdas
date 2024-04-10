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
import { removePendingUpdateAmendments } from './amendments';
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
		input.price - catalogInformation.supporterPlus.price;

	const startNewTerm = !dayjs(subscription.termStartDate).isSame(dayjs());

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
			startNewTerm,
			catalogInformation,
		);
	}
};

export const previewResponseFromZuoraResponse = (
	zuoraResponse: ZuoraPreviewResponse,
	catalogInformation: CatalogInformation,
): PreviewResponse => {
	const invoice = checkDefined(
		zuoraResponse.previewResult?.invoices[0],
		'No invoice found in the preview response',
	);
	const contributionRefundAmount = checkDefined(
		invoice.invoiceItems.find(
			(invoiceItem) =>
				invoiceItem.productRatePlanChargeId ===
				catalogInformation.contribution.chargeId,
		)?.amountWithoutTax,
		'No contribution refund amount found in the preview response',
	);

	const supporterPlusSubscriptionInvoiceItem = checkDefined(
		invoice.invoiceItems.find(
			(invoiceItem) =>
				invoiceItem.productRatePlanChargeId ===
				catalogInformation.supporterPlus.subscriptionChargeId,
		),
		'No supporter plus invoice item found in the preview response',
	);

	const supporterPlusContributionItem = checkDefined(
		invoice.invoiceItems.find(
			(invoiceItem) =>
				invoiceItem.productRatePlanChargeId ===
				catalogInformation.supporterPlus.contributionChargeId,
		),
		'No supporter plus invoice item found in the preview response',
	);

	return {
		amountPayableToday: invoice.amount,
		contributionRefundAmount,
		supporterPlusPurchaseAmount:
			supporterPlusSubscriptionInvoiceItem.unitPrice +
			supporterPlusContributionItem.unitPrice,
		nextPaymentDate: zuoraDateFormat(
			dayjs(supporterPlusSubscriptionInvoiceItem.serviceEndDate).add(1, 'days'),
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
		false,
	);
	const zuoraResponse: ZuoraPreviewResponse = await zuoraClient.post(
		'v1/orders/preview',
		JSON.stringify(requestBody),
		zuoraPreviewResponseSchema,
	);
	if (zuoraResponse.success) {
		return previewResponseFromZuoraResponse(zuoraResponse, catalogInformation);
	} else {
		throw new Error(zuoraResponse.reasons?.[0]?.message ?? 'Unknown error');
	}
};

export const doSwitch = async (
	zuoraClient: ZuoraClient,
	accountNumber: string,
	subscriptionNumber: string,
	contributionAmount: number,
	startNewTerm: boolean,
	catalogInformation: CatalogInformation,
): Promise<ZuoraSuccessResponse> => {
	//If the sub has a pending amount change amendment, we need to remove it
	await removePendingUpdateAmendments(zuoraClient, subscriptionNumber);

	const requestBody = buildRequestBody(
		dayjs(),
		accountNumber,
		subscriptionNumber,
		contributionAmount,
		catalogInformation,
		false,
		startNewTerm,
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
	startNewTerm: boolean,
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
	const newTermOrderActions = startNewTerm
		? [
				{
					type: 'TermsAndConditions',
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
					termsAndConditions: {
						lastTerm: {
							termType: 'TERMED',
							endDate: zuoraDateFormat(orderDate),
						},
					},
				},
				{
					type: 'RenewSubscription',
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
					renewSubscription: {},
				},
		  ]
		: [];

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
								catalogInformation.contribution.productRatePlanId,
							subType: 'Upgrade',
							newProductRatePlan: {
								productRatePlanId:
									catalogInformation.supporterPlus.productRatePlanId,
								chargeOverrides: [
									{
										productRatePlanChargeId:
											catalogInformation.supporterPlus.contributionChargeId,
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
					...newTermOrderActions,
				],
			},
		],
	};
};
