import type { BillingPeriod } from '@modules/billingPeriod';
import type {
	ProductCatalog,
	ProductRatePlan,
} from '@modules/product-catalog/productCatalog';
import { getAccount } from '@modules/zuora/getAccount';
import { getSubscription } from '@modules/zuora/getSubscription';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { RatePlan } from '@modules/zuora/zuoraSchemas';
import { supporterPlusAmountBands } from './supporterPlusAmountBands';

export type SupporterPlusPlans = {
	ratePlan: RatePlan;
	productRatePlan: ProductRatePlan<'SupporterPlus', 'Annual' | 'Monthly'>;
};
export function getSupporterPlusPlans(
	productCatalog: ProductCatalog,
	ratePlans: RatePlan[],
): SupporterPlusPlans {
	const supporterPlusProductRatePlans = {
		[productCatalog.SupporterPlus.ratePlans.Monthly.id]:
			productCatalog.SupporterPlus.ratePlans.Monthly,
		[productCatalog.SupporterPlus.ratePlans.Annual.id]:
			productCatalog.SupporterPlus.ratePlans.Annual,
	};

	const productRatePlans = ratePlans.reduce(
		(acc: SupporterPlusPlans[], ratePlan: RatePlan) => {
			const productRatePlan =
				supporterPlusProductRatePlans[ratePlan.productRatePlanId];

			if (productRatePlan !== undefined) {
				acc.push({ ratePlan, productRatePlan });
			}
			return acc;
		},
		[],
	);

	if (productRatePlans.length !== 1 || productRatePlans[0] === undefined) {
		throw new Error(
			`Expected 1 rate plan for Supporter Plus, got ${ratePlans.length}`,
		);
	}
	return productRatePlans[0];
}

const validateNewAmount = (
	newAmount: number,
	currency: string,
	billingPeriod: BillingPeriod,
): void => {
	const amountBand = supporterPlusAmountBands[currency][billingPeriod];
};

export const updateSupporterPlusAmount = async (
	zuoraClient: ZuoraClient,
	productCatalog: ProductCatalog,
	subscriptionNumber: string,
	//newPaymentAmount: number,
): Promise<void> => {
	const subscription = await getSubscription(zuoraClient, subscriptionNumber);
	const account = await getAccount(zuoraClient, subscription.accountNumber);
	const currency = account.billingAndPayment.currency;
	const supporterPlusPlans = getSupporterPlusPlans(
		productCatalog,
		subscription.ratePlans,
	);

	console.log(`${supporterPlusPlans.ratePlan.id} ${currency}`);
};
