import { getIfDefined } from '@modules/nullAndUndefined';
import type { Stage } from '@modules/stage';
import { sendToSupporterProductData } from '@modules/supporter-product-data/supporterProductData';
import {
	getBillingPreview,
	getOrderedInvoiceTotals,
	itemsForSubscription,
	toSimpleInvoiceItems,
} from '@modules/zuora/billingPreview';
import type {
	CreateOrderRequest,
	OrderRequest,
} from '@modules/zuora/orders/orderRequests';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type dayjs from 'dayjs';
import { takePaymentOrAdjustInvoice } from '../../payment';
import { sendSalesforceTracking } from '../../salesforceTracking';
import { supporterRatePlanItemFromSwitchInformation } from '../../supporterProductData';
import type { SwitchOrderRequestBuilder } from '../prepare/buildSwitchOrderRequest';
import type { SwitchInformation } from '../prepare/switchInformation';
import type {
	ProductSwitchRequestBody,
	ZuoraSwitchResponseWithIds,
} from '../schemas';
import { zuoraSwitchResponseWithIdsSchema } from '../schemas';
import { sendThankYouEmail } from './productSwitchEmail';

export type SwitchResponse = { message: string };

export type GetNextPayment = (
	targetDate: dayjs.Dayjs,
	subscriptionNumber: string,
) => Promise<{ date: Date; total: number } | undefined>;

export function buildGetNextPayment(zuoraClient: ZuoraClient): GetNextPayment {
	return async (targetDate, subscriptionNumber) => {
		const billingPreview = await getBillingPreview(
			zuoraClient,
			targetDate,
			subscriptionNumber,
		);
		const nextPayment: { date: Date; total: number } | undefined =
			getOrderedInvoiceTotals(
				toSimpleInvoiceItems(
					itemsForSubscription(subscriptionNumber)(billingPreview),
				),
			)[0];
		return nextPayment;
	};
}

export class DoSwitchAction {
	constructor(
		private zuoraClient: ZuoraClient,
		private stage: Stage,
		private today: dayjs.Dayjs,
		private getNextPayment: GetNextPayment,
	) {}
	async switch(
		input: Pick<ProductSwitchRequestBody, 'csrUserId' | 'caseId'>,
		switchInformation: SwitchInformation,
		orderRequest: SwitchOrderRequestBuilder,
	): Promise<SwitchResponse> {
		const invoiceId = await this.doSwitch(orderRequest.build(this.today));

		const paidAmount = await takePaymentOrAdjustInvoice(
			this.zuoraClient,
			invoiceId,
			switchInformation.target.subscriptionChargeId,
			switchInformation.account.id,
			switchInformation.account.defaultPaymentMethodId,
		);

		const nextPayment = await this.getNextPayment(
			this.today.add(13, 'months'),
			switchInformation.subscription.subscriptionNumber,
		);

		await Promise.allSettled([
			sendThankYouEmail(this.stage, paidAmount, nextPayment, switchInformation),
			sendSalesforceTracking(
				this.stage,
				input,
				paidAmount,
				switchInformation.target,
				switchInformation.subscription,
			),
			sendToSupporterProductData(
				this.stage,
				supporterRatePlanItemFromSwitchInformation(
					this.today,
					switchInformation,
				),
			),
		]);
		return {
			message: `Subscription ${switchInformation.subscription.subscriptionNumber} has successfully switched product`,
		};
	}

	private doSwitch = async (orderRequest: OrderRequest): Promise<string> => {
		const requestBody: CreateOrderRequest = {
			processingOptions: {
				runBilling: true,
				collectPayment: false, // We will take payment separately because we don't want to charge the user if the amount payable is less than 50 pence/cents
			},
			...orderRequest,
		};

		const switchResponse: ZuoraSwitchResponseWithIds =
			await this.zuoraClient.post(
				'v1/orders?returnIds=true',
				JSON.stringify(requestBody),
				zuoraSwitchResponseWithIdsSchema,
			);

		return getIfDefined(
			switchResponse.invoiceIds[0],
			'No invoice id returned from switch order',
		);
	};
}
