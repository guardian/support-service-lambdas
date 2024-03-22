import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import { zuoraDateFormat } from '@modules/zuora/common';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { ZuoraSuccessResponse } from '@modules/zuora/zuoraSchemas';
import { zuoraSuccessResponseSchema } from '@modules/zuora/zuoraSchemas';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { zuoraPreviewResponseSchema } from './schemas';

export const previewSwitch = async (
	zuoraClient: ZuoraClient,
	productCatalog: ProductCatalog,
	accountNumber: string,
	subscriptionNumber: string,
) => {
	const contributionProductRatePlanId =
		productCatalog.Contribution.ratePlans.Annual.id;
	const supporterPlusProductRatePlanId =
		productCatalog.SupporterPlus.ratePlans.Annual.id; // TODO: Monthly
	const body = requestBody(
		dayjs(),
		accountNumber,
		subscriptionNumber,
		contributionProductRatePlanId,
		supporterPlusProductRatePlanId,
		true,
	);
	return await zuoraClient.post(
		'v1/orders/preview',
		JSON.stringify(body),
		zuoraPreviewResponseSchema,
	);
};
export const switchToSupporterPlus = async (
	zuoraClient: ZuoraClient,
	productCatalog: ProductCatalog,
	accountNumber: string,
	subscriptionNumber: string,
): Promise<ZuoraSuccessResponse> => {
	const contributionProductRatePlanId =
		productCatalog.Contribution.ratePlans.Annual.id;
	const supporterPlusProductRatePlanId =
		productCatalog.SupporterPlus.ratePlans.Annual.id; // TODO: Monthly
	const body = requestBody(
		dayjs(),
		accountNumber,
		subscriptionNumber,
		contributionProductRatePlanId,
		supporterPlusProductRatePlanId,
		false,
	);
	return await zuoraClient.post(
		'v1/orders',
		JSON.stringify(body),
		zuoraSuccessResponseSchema,
	);
};

export const requestBody = (
	orderDate: Dayjs,
	accountNumber: string,
	subscriptionNumber: string,
	productRatePlanToRemoveId: string,
	newProductRatePlanId: string,
	preview: boolean,
) => {
	const options = preview
		? {
				previewOptions: {
					previewThruType: 'SpecificDate',
					previewTypes: ['BillingDocs'],
					specificPreviewThruDate: zuoraDateFormat(orderDate),
				},
		  }
		: {
				processingOptions: {
					runBilling: true,
					collectPayment: true,
				},
		  };
	return {
		orderDate: zuoraDateFormat(orderDate),
		existingAccountNumber: accountNumber,
		...options,
		subscriptions: [
			{
				subscriptionNumber: subscriptionNumber,
				orderActions: [
					{
						type: 'ChangePlan',
						triggerDates: [
							{
								name: 'ContractEffective',
								triggerDate: zuoraDateFormat(orderDate),
							},
							{
								name: 'ServiceActivation',
								triggerDate: zuoraDateFormat(orderDate),
							},
							{
								name: 'CustomerAcceptance',
								triggerDate: zuoraDateFormat(orderDate),
							},
						],
						changePlan: {
							productRatePlanId: productRatePlanToRemoveId,
							subType: 'Upgrade',
							newProductRatePlan: {
								productRatePlanId: newProductRatePlanId,
							},
						},
					},
				],
			},
		],
	};
};
