import { getIfDefined } from '@modules/nullAndUndefined';
import { sendToSupporterProductData } from '@modules/supporter-product-data/supporterProductData';
import type {
	ChangePlanOrderAction,
	OrderAction,
} from '@modules/zuora/orders/orderActions';
import { singleTriggerDate } from '@modules/zuora/orders/orderActions';
import type {
	CreateOrderRequest,
	OrderRequest,
	PreviewOrderRequest,
} from '@modules/zuora/orders/orderRequests';
import { previewOrderRequest } from '@modules/zuora/orders/orderRequests';
import type {
	RatePlan,
	RatePlanCharge,
	ZuoraSubscription,
} from '@modules/zuora/types/objects/subscription';
import { zuoraDateFormat } from '@modules/zuora/utils/common';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { removePendingUpdateAmendments } from './amendments';
import type { CatalogInformation } from './catalogInformation';
import type { Discount } from './discounts';
import { takePaymentOrAdjustInvoice } from './payment';
import { sendThankYouEmail } from './productSwitchEmail';
import { sendSalesforceTracking } from './salesforceTracking';
import type {
	ZuoraPreviewResponse,
	ZuoraPreviewResponseInvoice,
	ZuoraPreviewResponseInvoiceItem,
	ZuoraSwitchResponse,
} from './schemas';
import {
	zuoraPreviewResponseSchema,
	zuoraSwitchResponseSchema,
} from './schemas';
import { supporterRatePlanItemFromSwitchInformation } from './supporterProductData';
import type { SwitchInformation } from './switchInformation';

export interface SwitchDiscountResponse {
	discountedPrice: number;
	upToPeriods: number;
	upToPeriodsType: 'Months' | 'Years';
	discountPercentage: number;
}

export type PreviewResponse = {
	amountPayableToday: number;
	contributionRefundAmount: number;
	supporterPlusPurchaseAmount: number;
	nextPaymentDate: string;
	discount?: SwitchDiscountResponse;
};

export type SwitchResponse = { message: string };

export const switchToSupporterPlus = async (
	zuoraClient: ZuoraClient,
	productSwitchInformation: SwitchInformation,
	today: dayjs.Dayjs,
): Promise<SwitchResponse> => {
	const switchResponse = await doSwitch(
		zuoraClient,
		productSwitchInformation,
		today,
	);

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
		sendToSupporterProductData(
			productSwitchInformation.stage,
			supporterRatePlanItemFromSwitchInformation(productSwitchInformation),
		),
	]);
	return {
		message: `Product move completed successfully with subscription number ${productSwitchInformation.subscription.subscriptionNumber} and switch type recurring-contribution-to-supporter-plus`,
	};
};

export const refundExpected = (
	catalogInformation: CatalogInformation,
	subscription: ZuoraSubscription,
	currentDate: Date,
): boolean => {
	const ratePlan = getIfDefined(
		subscription.ratePlans.find(
			(ratePlan: RatePlan) =>
				ratePlan.productRatePlanId ===
				catalogInformation.contribution.productRatePlanId,
		),
		'No matching RatePlan found in Subscription,',
	);

	const chargedThroughDate: Date = getIfDefined(
		ratePlan.ratePlanCharges.find(
			(ratePlanCharge: RatePlanCharge) =>
				ratePlanCharge.productRatePlanChargeId ===
				catalogInformation.contribution.chargeId,
		)?.chargedThroughDate,
		'No matching chargedThroughDate found in Subscription',
	);

	return !(currentDate.toDateString() == chargedThroughDate.toDateString());
};

export const getContributionRefundAmount = (
	zuoraPreviewInvoice: ZuoraPreviewResponseInvoice,
	catalogInformation: CatalogInformation,
	subscription: ZuoraSubscription,
): number => {
	const contributionRefundAmount = zuoraPreviewInvoice.invoiceItems.find(
		(invoiceItem: ZuoraPreviewResponseInvoiceItem) =>
			invoiceItem.productRatePlanChargeId ===
			catalogInformation.contribution.chargeId,
	)?.amountWithoutTax;
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
				catalogInformation.supporterPlus.subscriptionChargeId,
		),
		'No supporter plus invoice item found in the preview response: id: ' +
			catalogInformation.supporterPlus.subscriptionChargeId,
	);

	const supporterPlusContributionItem = getIfDefined(
		invoice.invoiceItems.find(
			(invoiceItem) =>
				invoiceItem.productRatePlanChargeId ===
				catalogInformation.supporterPlus.contributionChargeId,
		),
		'No supporter plus invoice item found in the preview response: id: ' +
			catalogInformation.supporterPlus.contributionChargeId,
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
	if (zuoraResponse.success) {
		return previewResponseFromZuoraResponse(
			zuoraResponse,
			productSwitchInformation.catalog,
			subscription,
			productSwitchInformation.discount,
		);
	} else {
		throw new Error(zuoraResponse.reasons?.[0]?.message ?? 'Unknown error');
	}
};

export const doSwitch = async (
	zuoraClient: ZuoraClient,
	productSwitchInformation: SwitchInformation,
	today: dayjs.Dayjs,
): Promise<ZuoraSwitchResponse> => {
	const { subscriptionNumber } = productSwitchInformation.subscription;
	//If the sub has a pending amount change amendment, we need to remove it
	await removePendingUpdateAmendments(zuoraClient, subscriptionNumber, today);

	const requestBody = buildSwitchRequestBody(today, productSwitchInformation);
	const zuoraResponse: ZuoraSwitchResponse = await zuoraClient.post(
		'v1/orders?returnIds=true',
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

const buildAddDiscountOrderAction = (
	discount: Discount,
	orderDate: Dayjs,
): OrderAction[] => {
	return [
		{
			type: 'AddProduct',
			triggerDates: singleTriggerDate(orderDate),
			addProduct: {
				productRatePlanId: discount.productRatePlanId,
			},
		},
	];
};

const buildChangePlanOrderAction = (
	orderDate: Dayjs,
	catalog: CatalogInformation,
	contributionAmount: number,
): ChangePlanOrderAction => {
	return {
		type: 'ChangePlan',
		triggerDates: singleTriggerDate(orderDate),
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

function buildNewTermOrderActions(orderDate: dayjs.Dayjs): OrderAction[] {
	return [
		{
			type: 'TermsAndConditions',
			triggerDates: singleTriggerDate(orderDate),
			termsAndConditions: {
				lastTerm: {
					termType: 'TERMED',
					endDate: zuoraDateFormat(orderDate),
				},
			},
		},
		{
			type: 'RenewSubscription',
			triggerDates: singleTriggerDate(orderDate),
		},
	];
}

export const buildSwitchRequestBody = (
	orderDate: Dayjs,
	productSwitchInformation: SwitchInformation,
): CreateOrderRequest => {
	return {
		processingOptions: {
			runBilling: true,
			collectPayment: false, // We will take payment separately because we don't want to charge the user if the amount payable is less than 50 pence/cents
		},
		...buildSwitchRequestWithoutOptions(
			productSwitchInformation,
			orderDate,
			false,
		),
	};
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

function buildSwitchRequestWithoutOptions(
	productSwitchInformation: SwitchInformation,
	orderDate: dayjs.Dayjs,
	preview: boolean,
): OrderRequest {
	const { startNewTerm, contributionAmount, catalog } =
		productSwitchInformation;
	const { accountNumber, subscriptionNumber } =
		productSwitchInformation.subscription;

	// don't preview term update, because future dated amendments might prevent it
	const maybeNewTermOrderActions: OrderAction[] =
		startNewTerm && !preview ? buildNewTermOrderActions(orderDate) : [];

	const discountOrderAction = productSwitchInformation.discount
		? buildAddDiscountOrderAction(productSwitchInformation.discount, orderDate)
		: [];

	return {
		orderDate: zuoraDateFormat(orderDate),
		existingAccountNumber: accountNumber,
		subscriptions: [
			{
				subscriptionNumber,
				customFields: { LastPlanAddedDate__c: zuoraDateFormat(orderDate) },
				orderActions: [
					buildChangePlanOrderAction(orderDate, catalog, contributionAmount),
					...discountOrderAction,
					...maybeNewTermOrderActions,
				],
			},
		],
	};
}
