import type {
	ChangePlanOrderAction,
	OrderAction,
} from '@modules/zuora/orders/orderActions';
import { singleTriggerDate } from '@modules/zuora/orders/orderActions';
import type { OrderRequest } from '@modules/zuora/orders/orderRequests';
import { zuoraDateFormat } from '@modules/zuora/utils/common';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { TargetContribution } from './targetInformation';
import {
	shouldStartNewTerm,
	SubscriptionInformation,
} from './subscriptionInformation';

const buildAddDiscountOrderAction = (
	productRatePlanId: string,
	orderDate: Dayjs,
): OrderAction[] => {
	return [
		{
			type: 'AddProduct',
			triggerDates: singleTriggerDate(orderDate),
			addProduct: {
				productRatePlanId,
			},
		},
	];
};

const buildChangePlanOrderAction = (
	orderDate: Dayjs,
	productRatePlanId: string,
	contributionCharge: TargetContribution | undefined,
	sourceProductRatePlanId: string,
): ChangePlanOrderAction => {
	return {
		type: 'ChangePlan',
		triggerDates: singleTriggerDate(orderDate),
		changePlan: {
			productRatePlanId: sourceProductRatePlanId,
			subType: 'Upgrade',
			newProductRatePlan: {
				productRatePlanId,
				chargeOverrides:
					contributionCharge === undefined
						? undefined
						: [
								{
									productRatePlanChargeId: contributionCharge.id,
									pricing: {
										recurringFlatFee: {
											listPrice: contributionCharge.contributionAmount,
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

export class SwitchOrderRequestBuilder {
	constructor(
		private productRatePlanId: string,
		private contributionCharge: TargetContribution | undefined,
		private discountProductRatePlanId: string | undefined,
		private subscriptionInformation: SubscriptionInformation,
		private preview: boolean,
	) {}

	build(orderDate: dayjs.Dayjs): OrderRequest {
		const { accountNumber, subscriptionNumber, termStartDate } =
			this.subscriptionInformation;

		// don't preview term update, because future dated amendments might prevent it
		const maybeNewTermOrderActions: OrderAction[] =
			shouldStartNewTerm(termStartDate, orderDate) && !this.preview
				? buildNewTermOrderActions(orderDate)
				: [];

		const discountOrderAction = this.discountProductRatePlanId
			? buildAddDiscountOrderAction(this.discountProductRatePlanId, orderDate)
			: [];

		return {
			orderDate: zuoraDateFormat(orderDate),
			existingAccountNumber: accountNumber,
			subscriptions: [
				{
					subscriptionNumber,
					customFields: { LastPlanAddedDate__c: zuoraDateFormat(orderDate) },
					orderActions: [
						buildChangePlanOrderAction(
							orderDate,
							this.productRatePlanId,
							this.contributionCharge,
							this.subscriptionInformation.productRatePlanId,
						),
						...discountOrderAction,
						...maybeNewTermOrderActions,
					],
				},
			],
		};
	}
}
