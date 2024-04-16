import { checkDefined } from '@modules/nullAndUndefined';
import { zuoraDateFormat } from '@modules/zuora/common';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { removePendingUpdateAmendments } from './amendments';
import type { CatalogInformation } from './catalogInformation';
import { sendRecurringContributionToSupporterPlusEmail } from './productSwitchEmail';
import { sendSalesforceTracking } from './salesforceTracking';
import type { ZuoraPreviewResponse, ZuoraSwitchResponse } from './schemas';
import {
	zuoraPreviewResponseSchema,
	zuoraSwitchResponseSchema,
} from './schemas';
import type { SwitchInformation } from './switchInformation';

export type PreviewResponse = {
	amountPayableToday: number;
	contributionRefundAmount: number;
	supporterPlusPurchaseAmount: number;
	nextPaymentDate: string;
};

export const switchToSupporterPlus = async (
	zuoraClient: ZuoraClient,
	productSwitchInformation: SwitchInformation,
) => {
	const paidAmount = await doSwitch(zuoraClient, productSwitchInformation);

	await sendRecurringContributionToSupporterPlusEmail(
		paidAmount,
		productSwitchInformation,
	);

	await sendSalesforceTracking(productSwitchInformation, paidAmount);
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
	const requestBody = buildPreviewRequestBody(
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
): Promise<number> => {
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

	return checkDefined(
		zuoraResponse.paidAmount,
		'No paid amount found in the response',
	);
};

const buildChangePlanOrderAction = (
	orderDate: Dayjs,
	catalog: CatalogInformation,
	contributionAmount: number,
) => {
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
) => {
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
) => {
	const { startNewTerm, contributionAmount, catalog } =
		productSwitchInformation;
	const { accountNumber, subscriptionNumber } =
		productSwitchInformation.subscription;

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
		processingOptions: {
			runBilling: true,
			collectPayment: true,
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
