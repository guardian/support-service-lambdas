import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { TargetInformation } from './targetInformation';
import dayjs from 'dayjs';
import {
	ProductSwitchRequestBody,
	ZuoraSwitchResponse,
	zuoraSwitchResponseSchema,
} from '../schemas';
import { removePendingUpdateAmendments } from '../amendments';
import { takePaymentOrAdjustInvoice } from '../payment';
import { sendThankYouEmail } from './productSwitchEmail';
import { sendSalesforceTracking } from '../salesforceTracking';
import { sendToSupporterProductData } from '@modules/supporter-product-data/supporterProductData';
import { supporterRatePlanItemFromSwitchInformation } from '../supporterProductData';
import {
	CreateOrderRequest,
	OrderRequest,
} from '@modules/zuora/orders/orderRequests';
import { Stage } from '@modules/stage';
import { AccountInformation } from './accountInformation';
import { SubscriptionInformation } from './subscriptionInformation';
import { getIfDefined } from '@modules/nullAndUndefined';

export type SwitchResponse = { message: string };

export const switchToSupporterPlus = async (
	zuoraClient: ZuoraClient,
	stage: Stage,
	input: ProductSwitchRequestBody,
	accountInformation: AccountInformation,
	targetInformation: TargetInformation,
	subscriptionInformation: SubscriptionInformation,
	today: dayjs.Dayjs,
	orderRequest: OrderRequest,
): Promise<SwitchResponse> => {
	//If the sub has a pending amount change amendment, we need to remove it
	await removePendingUpdateAmendments(
		zuoraClient,
		subscriptionInformation.subscriptionNumber,
		today,
	);

	const invoiceId = await doSwitch(zuoraClient, orderRequest);

	const paidAmount = await takePaymentOrAdjustInvoice(
		zuoraClient,
		invoiceId,
		targetInformation.subscriptionChargeId,
		accountInformation.id,
		accountInformation.defaultPaymentMethodId,
	);

	await Promise.allSettled([
		sendThankYouEmail(
			stage,
			paidAmount,
			targetInformation,
			accountInformation,
			subscriptionInformation,
		),
		sendSalesforceTracking(
			stage,
			input,
			paidAmount,
			targetInformation,
			subscriptionInformation,
		),
		sendToSupporterProductData(
			stage,
			supporterRatePlanItemFromSwitchInformation(
				targetInformation,
				accountInformation,
				subscriptionInformation,
			),
		),
	]);
	return {
		message: `Product move completed successfully with subscription number ${subscriptionInformation.subscriptionNumber} and switch type recurring-contribution-to-supporter-plus`,
	};
};

export const doSwitch = async (
	zuoraClient: ZuoraClient,
	orderRequest: OrderRequest,
): Promise<string> => {
	const requestBody = buildSwitchRequestBody(orderRequest);

	const switchResponse: ZuoraSwitchResponse = await zuoraClient.post(
		'v1/orders?returnIds=true',
		JSON.stringify(requestBody),
		zuoraSwitchResponseSchema,
	);
	const invoiceId = getIfDefined(
		switchResponse.invoiceIds?.at(0),
		'No invoice number found in the switch response',
	);

	return invoiceId;
};

export const buildSwitchRequestBody = (
	orderRequest: OrderRequest,
): CreateOrderRequest => {
	return {
		processingOptions: {
			runBilling: true,
			collectPayment: false, // We will take payment separately because we don't want to charge the user if the amount payable is less than 50 pence/cents
		},
		...orderRequest,
	};
};
