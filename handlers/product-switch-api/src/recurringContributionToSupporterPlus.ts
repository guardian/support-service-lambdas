import { checkDefined } from '@modules/nullAndUndefined';
import { getProductRatePlanId } from '@modules/product/productToCatalogMapping';
import type { Stage } from '@modules/stage';
import { cancelSubscription } from '@modules/zuora/cancelSubscription';
import { getSubscription } from '@modules/zuora/getSubscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { ZuoraSubscription } from '@modules/zuora/zuoraSchemas';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { productSwitchRequestSchema } from './requestSchema';

export const performSwitch = async (
	stage: Stage,
	subscriptionNumber: string,
	requestBody: string,
) => {
	const zuoraClient = await ZuoraClient.create(stage);
	const productSwitchRequestBody = productSwitchRequestSchema.parse(
		JSON.parse(requestBody),
	);
	const subscription = await getSubscription(zuoraClient, subscriptionNumber);
};

const cancelExistingSubscription = async (
	zuoraClient: ZuoraClient,
	subscriptionNumber: string,
	contractEffectiveDate: Dayjs,
) => {
	await cancelSubscription(
		zuoraClient,
		subscriptionNumber,
		contractEffectiveDate,
		false,
	);
};

const productOptionFromBillingPeriod = (billingPeriod: string) => {
	if (billingPeriod === 'Month') {
		return 'Monthly';
	} else if (billingPeriod === 'Annual') {
		return 'Annual';
	}
	throw new Error(`Unexpected billing period: ${billingPeriod}`);
};
const getSupporterPlusProductRatePlan = (
	stage: Stage,
	subscription: ZuoraSubscription,
) => {
	const billingPeriod = checkDefined(
		subscription.ratePlans[0]?.ratePlanCharges[0]?.billingPeriod,
		'Billing period was undefined in response from Zuora',
	);

	const productOption = productOptionFromBillingPeriod(billingPeriod);
	return getProductRatePlanId(stage, 'SupporterPlus', 'Digital', productOption);
};

const createNewSubscription = async (
	zuoraClient: ZuoraClient,
	accountNumber: string,
	supporterPlusProductRatePlanId: string,
	contractEffectiveDate: Dayjs,
) => {
	const subscribeBody = {
		subscribes: [
			{
				Account: {
					AccountNumber: accountNumber,
				},
				SubscriptionData: {
					RatePlanData: [
						{
							RatePlan: {
								ProductRatePlanId: supporterPlusProductRatePlanId,
							},
							RatePlanChargeData: [
								{
									RatePlanCharge: {
										ProductRatePlanChargeId: '8ad096ca858682bb0185881568385d73',
										Price: 0,
										EndDateCondition: 'SubscriptionEnd',
									},
								},
							],
							SubscriptionProductFeatureList: [],
						},
					],
					Subscription: {
						ContractEffectiveDate: contractEffectiveDate,
						ContractAcceptanceDate: contractEffectiveDate,
						TermStartDate: contractEffectiveDate,
						AutoRenew: true,
						InitialTermPeriodType: 'Month',
						InitialTerm: 12,
						RenewalTerm: 12,
						TermType: 'TERMED',
						ReaderType__c: 'Direct',
					},
				},
				SubscribeOptions: { GenerateInvoice: true, ProcessPayments: true },
			},
		],
	};
};
