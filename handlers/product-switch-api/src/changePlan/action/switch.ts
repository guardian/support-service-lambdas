import type { EmailMessageWithUserId } from '@modules/email/email';
import type { Stage } from '@modules/stage';
import { sendToSupporterProductData } from '@modules/supporter-product-data/supporterProductData';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type dayjs from 'dayjs';
import { takePaymentOrAdjustInvoice } from '../../payment';
import { sendSalesforceTracking } from '../../salesforceTracking';
import { supporterRatePlanItemFromSwitchInformation } from '../../supporterProductData';
import type { SwitchOrderRequestBuilder } from '../prepare/buildSwitchOrderRequest';
import type { SwitchInformation } from '../prepare/switchInformation';
import type { ProductSwitchRequestBody } from '../schemas';
import type { CreateSwitchOrder } from './createSwitchOrder';
import { buildEmailMessage } from './productSwitchEmail';

export type SwitchResponse = { message: string };

export class DoSwitchAction {
	constructor(
		private zuoraClient: ZuoraClient,
		private stage: Stage,
		private today: dayjs.Dayjs,
		private createSwitchOrder: CreateSwitchOrder,
		private sendEmail: (
			stage: Stage,
			message: EmailMessageWithUserId,
		) => Promise<unknown>,
	) {}

	async switch(
		input: Pick<ProductSwitchRequestBody, 'csrUserId' | 'caseId'>,
		switchInformation: SwitchInformation,
		orderRequest: SwitchOrderRequestBuilder,
	): Promise<SwitchResponse> {
		const invoiceId = await this.createSwitchOrder.execute(
			orderRequest.build(this.today),
		);

		const paidAmount = await takePaymentOrAdjustInvoice(
			this.zuoraClient,
			invoiceId,
			switchInformation.target.subscriptionChargeId,
			switchInformation.account.id,
			switchInformation.account.defaultPaymentMethodId,
		);

		await Promise.allSettled([
			this.sendThankYouEmail(paidAmount, switchInformation),
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

	private sendThankYouEmail(
		firstPaymentAmount: number,
		switchInformation: SwitchInformation,
	) {
		const emailMessage: EmailMessageWithUserId = buildEmailMessage(
			firstPaymentAmount,
			switchInformation,
			this.today,
		);

		return this.sendEmail(this.stage, emailMessage);
	}
}
