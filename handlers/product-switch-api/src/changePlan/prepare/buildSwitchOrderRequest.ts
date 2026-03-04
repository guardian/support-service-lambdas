import type {
	ChangePlanOrderAction,
	OrderAction,
} from '@modules/zuora/orders/orderActions';
import { singleTriggerDate } from '@modules/zuora/orders/orderActions';
import type { OrderRequest } from '@modules/zuora/orders/orderRequests';
import { zuoraDateFormat } from '@modules/zuora/utils/common';
import type { Dayjs } from 'dayjs';
import type dayjs from 'dayjs';
import type { SubscriptionInformation } from './subscriptionInformation';
import type { TargetContribution } from './targetInformation';

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
	sourceRatePlanId: string,
): ChangePlanOrderAction => {
	return {
		type: 'ChangePlan',
		triggerDates: singleTriggerDate(orderDate),
		changePlan: {
			ratePlanId: sourceRatePlanId,
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

export class SwitchOrderRequestBuilder {
	constructor(
		private productRatePlanId: string,
		private contributionCharge: TargetContribution | undefined,
		private discountProductRatePlanId: string | undefined,
		private subscriptionInformation: SubscriptionInformation,
	) {}

	build(orderDate: dayjs.Dayjs): OrderRequest {
		const { accountNumber, subscriptionNumber } = this.subscriptionInformation;

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
							this.subscriptionInformation.ratePlanId,
						),
						...discountOrderAction,
					],
				},
			],
		};
	}
}
