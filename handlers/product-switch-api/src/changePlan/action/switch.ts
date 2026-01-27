import { getIfDefined } from '@modules/nullAndUndefined';
import type { Stage } from '@modules/stage';
import { sendToSupporterProductData } from '@modules/supporter-product-data/supporterProductData';
import type {
	CreateOrderRequest,
	OrderRequest,
} from '@modules/zuora/orders/orderRequests';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type dayjs from 'dayjs';
import { removePendingUpdateAmendments } from '../../amendments';
import { takePaymentOrAdjustInvoice } from '../../payment';
import { sendSalesforceTracking } from '../../salesforceTracking';
import { supporterRatePlanItemFromSwitchInformation } from '../../supporterProductData';
import type { SwitchOrderRequestBuilder } from '../prepare/buildSwitchOrderRequest';
import type { SwitchInformation } from '../prepare/switchInformation';
import type { ProductSwitchRequestBody, ZuoraSwitchResponse } from '../schemas';
import { zuoraSwitchResponseSchema } from '../schemas';
import { sendThankYouEmail } from './productSwitchEmail';

export type SwitchResponse = { message: string };

export class DoSwitchAction {
	constructor(
		private zuoraClient: ZuoraClient,
		private stage: Stage,
		private today: dayjs.Dayjs,
	) {}
	async switchToSupporterPlus(
		input: Pick<ProductSwitchRequestBody, 'csrUserId' | 'caseId'>,
		switchInformation: SwitchInformation,
		orderRequest: SwitchOrderRequestBuilder,
	): Promise<SwitchResponse> {
		//If the sub has a pending amount change amendment, we need to remove it
		await removePendingUpdateAmendments(
			this.zuoraClient,
			switchInformation.subscription.subscriptionNumber,
			this.today,
		);

		const invoiceId = await this.doSwitch(orderRequest.build(this.today));

		const paidAmount = await takePaymentOrAdjustInvoice(
			this.zuoraClient,
			invoiceId,
			switchInformation.target.subscriptionChargeId,
			switchInformation.account.id,
			switchInformation.account.defaultPaymentMethodId,
		);

		await Promise.allSettled([
			sendThankYouEmail(this.stage, paidAmount, switchInformation),
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
			message: `Product move completed successfully with subscription number ${switchInformation.subscription.subscriptionNumber} and switch type recurring-contribution-to-supporter-plus`,
		};
	}

	private doSwitch = async (orderRequest: OrderRequest): Promise<string> => {
		const requestBody = buildSwitchRequestBody(orderRequest);

		const switchResponse: ZuoraSwitchResponse = await this.zuoraClient.post(
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
}

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
