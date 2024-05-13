import { checkDefined } from '@modules/nullAndUndefined';
import { zuoraDateFormat } from '@modules/zuora/common';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type {
	ChangePlanOrderAction,
	CreateOrderRequest,
	OrderAction,
	PreviewOrderRequest,
	ZuoraPreviewResponse,
	ZuoraSwitchResponse,
} from '../schemas';
import {
	zuoraPreviewResponseSchema,
	zuoraSwitchResponseSchema,
} from '../schemas';
import { removePendingUpdateAmendments } from './amendments';
import type { CatalogInformation } from './catalogInformation';
import { takePaymentOrAdjustInvoice } from './payment';
import { sendThankYouEmail } from './productSwitchEmail';
import { sendSalesforceTracking } from './salesforceTracking';
import { sendToSupporterProductData } from './supporterProductData';
import type { SwitchInformation } from './switchInformation';

export type PreviewResponse = {
	amountPayableToday: number;
	contributionRefundAmount: number;
	supporterPlusPurchaseAmount: number;
	nextPaymentDate: string;
};

export type SwitchResponse = { message: string };

export const switchToSupporterPlus = async (
	zuoraClient: ZuoraClient,
	productSwitchInformation: SwitchInformation,
): Promise<SwitchResponse> => {
	const switchResponse = await doSwitch(zuoraClient, productSwitchInformation);

	const paidAmount = await takePaymentOrAdjustInvoice(
		zuoraClient,
		switchResponse,
		productSwitchInformation.catalog.supporterPlus.subscriptionChargeId,
		productSwitchInformation.account.id,
		productSwitchInformation.account.defaultPaymentMethodId,
	);

	await Promise.allSettled([
		sendThankYouEmail(paidAmount, productSwitchInformation),
		sendSalesforceTracking(paidAmount, productSwitchInformation),
		sendToSupporterProductData(productSwitchInformation),
	]);
	return {
		message: `Product move completed successfully with subscription number ${productSwitchInformation.subscription.subscriptionNumber} and switch type recurring-contribution-to-supporter-plus`,
	};
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
	productSwitchInformation: SwitchInformation,
): Promise<PreviewResponse> => {
	const requestBody: PreviewOrderRequest = buildPreviewRequestBody(
		dayjs(),
		productSwitchInformation,
	);
	const zuoraResponse: ZuoraPreviewResponse = await zuoraClient.post(
		'v1/orders/preview',
		JSON.stringify(requestBody),
		zuoraPreviewResponseSchema,
	);
	if (zuoraResponse.success) {
		return previewResponseFromZuoraResponse(
			zuoraResponse,
			productSwitchInformation.catalog,
		);
	} else {
		throw new Error(zuoraResponse.reasons?.[0]?.message ?? 'Unknown error');
	}
};

export const doSwitch = async (
	zuoraClient: ZuoraClient,
	productSwitchInformation: SwitchInformation,
): Promise<ZuoraSwitchResponse> => {
	const { subscriptionNumber } = productSwitchInformation.subscription;
	//If the sub has a pending amount change amendment, we need to remove it
	await removePendingUpdateAmendments(zuoraClient, subscriptionNumber);

	const requestBody = buildSwitchRequestBody(dayjs(), productSwitchInformation);
	const zuoraResponse: ZuoraSwitchResponse = await zuoraClient.post(
		'v1/orders',
		JSON.stringify(requestBody),
		zuoraSwitchResponseSchema,
	);
	if (!zuoraResponse.success) {
		const reason = zuoraResponse.reasons?.[0]?.message ?? 'Unknown error';
		throw new Error(
			`Failed to switch subscription ${subscriptionNumber} to Supporter Plus: ${reason}`,
		);
	}

	return zuoraResponse;
};

const buildChangePlanOrderAction = (
	orderDate: Dayjs,
	catalog: CatalogInformation,
	contributionAmount: number,
): ChangePlanOrderAction => {
	return {
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
			productRatePlanId: catalog.contribution.productRatePlanId,
			subType: 'Upgrade',
			newProductRatePlan: {
				productRatePlanId: catalog.supporterPlus.productRatePlanId,
				chargeOverrides: [
					{
						productRatePlanChargeId: catalog.supporterPlus.contributionChargeId,
						pricing: {
							recurringFlatFee: {
								listPrice: contributionAmount,
							},
						},
					},
				],
			},
		},
	};
};

const buildPreviewRequestBody = (
	orderDate: Dayjs,
	productSwitchInformation: SwitchInformation,
): PreviewOrderRequest => {
	const { contributionAmount, catalog } = productSwitchInformation;
	const { accountNumber, subscriptionNumber } =
		productSwitchInformation.subscription;

	return {
		orderDate: zuoraDateFormat(orderDate),
		existingAccountNumber: accountNumber,
		previewOptions: {
			previewThruType: 'SpecificDate',
			previewTypes: ['BillingDocs'],
			specificPreviewThruDate: zuoraDateFormat(orderDate),
		},
		subscriptions: [
			{
				subscriptionNumber,
				orderActions: [
					buildChangePlanOrderAction(orderDate, catalog, contributionAmount),
				],
			},
		],
	};
};

export const buildSwitchRequestBody = (
	orderDate: Dayjs,
	productSwitchInformation: SwitchInformation,
): CreateOrderRequest => {
	const { startNewTerm, contributionAmount, catalog } =
		productSwitchInformation;
	const { accountNumber, subscriptionNumber } =
		productSwitchInformation.subscription;

	const newTermOrderActions: OrderAction[] = startNewTerm
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
		processingOptions: {
			runBilling: true,
			collectPayment: false, // We will take payment separately because we don't want to charge the user if the amount payable is less than 50 pence/cents
		},
		subscriptions: [
			{
				subscriptionNumber,
				orderActions: [
					buildChangePlanOrderAction(orderDate, catalog, contributionAmount),
					...newTermOrderActions,
				],
			},
		],
	};
};
