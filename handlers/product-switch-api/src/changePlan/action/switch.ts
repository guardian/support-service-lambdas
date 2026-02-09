import type { Stage } from '@modules/stage';
import { sendToSupporterProductData } from '@modules/supporter-product-data/supporterProductData';
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
import { removePendingUpdateAmendments } from './amendments';
import { sendThankYouEmail } from './productSwitchEmail';

export type SwitchResponse = { message: string };

export class DoSwitchAction {
	constructor(
		private zuoraClient: ZuoraClient,
		private stage: Stage,
		private today: dayjs.Dayjs,
	) {}
	async switch(
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

		return switchResponse.invoiceIds[0];
	};
}
