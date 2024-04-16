import { checkDefined } from '@modules/nullAndUndefined';
import { zuoraDateFormat } from '@modules/zuora/common';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { removePendingUpdateAmendments } from './amendments';
import type { BillingInformation } from './billingInformation';
import { sendRecurringContributionToSupporterPlusEmail } from './productSwitchEmail';
import type { ZuoraPreviewResponse, ZuoraSwitchResponse } from './schemas';
import {
	zuoraPreviewResponseSchema,
	zuoraSwitchResponseSchema,
} from './schemas';
import type { ProductSwitchInformation } from './userInformation';

export type PreviewResponse = {
	amountPayableToday: number;
	contributionRefundAmount: number;
	supporterPlusPurchaseAmount: number;
	nextPaymentDate: string;
};

export const switchToSupporterPlus = async (
	zuoraClient: ZuoraClient,
	productSwitchInformation: ProductSwitchInformation,
) => {
	if (productSwitchInformation.preview) {
		await preview(zuoraClient, productSwitchInformation);
	} else {
		const paidAmount = await doSwitch(zuoraClient, productSwitchInformation);

		await sendRecurringContributionToSupporterPlusEmail(
			paidAmount,
			productSwitchInformation,
		);
	}
};

export const previewResponseFromZuoraResponse = (
	zuoraResponse: ZuoraPreviewResponse,
	billingInformation: BillingInformation,
): PreviewResponse => {
	const invoice = checkDefined(
		zuoraResponse.previewResult?.invoices[0],
		'No invoice found in the preview response',
	);
	const contributionRefundAmount = checkDefined(
		invoice.invoiceItems.find(
			(invoiceItem) =>
				invoiceItem.productRatePlanChargeId ===
				billingInformation.contribution.chargeId,
		)?.amountWithoutTax,
		'No contribution refund amount found in the preview response',
	);

	const supporterPlusSubscriptionInvoiceItem = checkDefined(
		invoice.invoiceItems.find(
			(invoiceItem) =>
				invoiceItem.productRatePlanChargeId ===
				billingInformation.supporterPlus.subscriptionChargeId,
		),
		'No supporter plus invoice item found in the preview response',
	);

	const supporterPlusContributionItem = checkDefined(
		invoice.invoiceItems.find(
			(invoiceItem) =>
				invoiceItem.productRatePlanChargeId ===
				billingInformation.supporterPlus.contributionChargeId,
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
	productSwitchInformation: ProductSwitchInformation,
): Promise<PreviewResponse> => {
	const requestBody = buildRequestBody(dayjs(), productSwitchInformation, true);
	const zuoraResponse: ZuoraPreviewResponse = await zuoraClient.post(
		'v1/orders/preview',
		JSON.stringify(requestBody),
		zuoraPreviewResponseSchema,
	);
	if (zuoraResponse.success) {
		return previewResponseFromZuoraResponse(
			zuoraResponse,
			productSwitchInformation.billingInformation,
		);
	} else {
		throw new Error(zuoraResponse.reasons?.[0]?.message ?? 'Unknown error');
	}
};

export const doSwitch = async (
	zuoraClient: ZuoraClient,
	productSwitchInformation: ProductSwitchInformation,
): Promise<number> => {
	const { subscriptionNumber } =
		productSwitchInformation.subscriptionInformation;
	//If the sub has a pending amount change amendment, we need to remove it
	await removePendingUpdateAmendments(zuoraClient, subscriptionNumber);

	const requestBody = buildRequestBody(
		dayjs(),
		productSwitchInformation,
		false,
	);
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

export const buildRequestBody = (
	orderDate: Dayjs,
	productSwitchInformation: ProductSwitchInformation,
	preview: boolean,
) => {
	const { startNewTerm, contributionAmount } =
		productSwitchInformation.billingInformation;
	const { accountNumber, subscriptionNumber } =
		productSwitchInformation.subscriptionInformation;
	const catalogInformation = productSwitchInformation.billingInformation;
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
				subscriptionNumber,
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
