import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { SwitchInformation } from './switchInformation';
import dayjs, { type Dayjs } from 'dayjs';
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
import type { CreateOrderRequest } from '@modules/zuora/orders/orderRequests';
import { buildSwitchRequestWithoutOptions } from './buildSwitchOrderRequest';
import { Stage } from '@modules/stage';

export type SwitchResponse = { message: string };

export const switchToSupporterPlus = async (
	zuoraClient: ZuoraClient,
	stage: Stage,
	input: ProductSwitchRequestBody,
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
		productSwitchInformation.catalog.targetProduct.baseChargeIds,
		productSwitchInformation.account.id,
		productSwitchInformation.account.defaultPaymentMethodId,
	);

	await Promise.allSettled([
		sendThankYouEmail(stage, paidAmount, productSwitchInformation),
		sendSalesforceTracking(stage, input, paidAmount, productSwitchInformation),
		sendToSupporterProductData(
			stage,
			supporterRatePlanItemFromSwitchInformation(productSwitchInformation),
		),
	]);
	return {
		message: `Product move completed successfully with subscription number ${productSwitchInformation.subscription.subscriptionNumber} and switch type recurring-contribution-to-supporter-plus`,
	};
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

	return await zuoraClient.post(
		'v1/orders?returnIds=true',
		JSON.stringify(requestBody),
		zuoraSwitchResponseSchema,
	);
};
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
