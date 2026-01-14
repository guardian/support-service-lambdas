import type {
	ChangePlanOrderAction,
	OrderAction,
} from '@modules/zuora/orders/orderActions';
import { singleTriggerDate } from '@modules/zuora/orders/orderActions';
import type { OrderRequest } from '@modules/zuora/orders/orderRequests';
import { zuoraDateFormat } from '@modules/zuora/utils/common';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { CatalogInformation } from '../catalogInformation';
import type { Discount } from '../discounts';
import type {
	SwitchInformation,
	TargetContribution,
} from './switchInformation';

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
	targetContribution?: TargetContribution,
): ChangePlanOrderAction => {
	return {
		type: 'ChangePlan',
		triggerDates: singleTriggerDate(orderDate),
		changePlan: {
			productRatePlanId: catalog.sourceProduct.productRatePlanId,
			subType: 'Upgrade',
			newProductRatePlan: {
				productRatePlanId: catalog.targetProduct.productRatePlanId,
				chargeOverrides:
					targetContribution === undefined
						? undefined
						: [
								{
									productRatePlanChargeId: targetContribution.chargeId,
									pricing: {
										recurringFlatFee: {
											listPrice: targetContribution.contributionAmount,
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

export function buildSwitchRequestWithoutOptions(
	productSwitchInformation: SwitchInformation,
	orderDate: dayjs.Dayjs,
	preview: boolean,
): OrderRequest {
	const { startNewTerm, targetContribution, catalog } =
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
					buildChangePlanOrderAction(orderDate, catalog, targetContribution),
					...discountOrderAction,
					...maybeNewTermOrderActions,
				],
			},
		],
	};
}
