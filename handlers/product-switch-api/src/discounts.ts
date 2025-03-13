import type { BillingPeriod } from '@modules/billingPeriod';
import type { Stage } from '@modules/stage';

export type Discount = {
	// the following fields match the charge in the zuora catalog
	// https://knowledgecenter.zuora.com/Zuora_Platform/API/G_SOAP_API/E1_SOAP_API_Object_Reference/ProductRatePlanCharge
	productRatePlanId: string;
	name: string;
	upToPeriods: number;
	upToPeriodsType: 'Days' | 'Weeks' | 'Months' | 'Years';
	discountPercentage: number;
};

const annualContribHalfPriceSupporterPlusForOneYear = (
	stage: Stage,
): Discount => ({
	productRatePlanId: stage === 'PROD' ? '' : '71a1383e2b395842e6f58a2754ad00c1',
	name: 'Cancellation Save - Annual Contribution to Supporter Plus Switch 50% off 1 year',
	upToPeriods: 1,
	upToPeriodsType: 'Years',
	discountPercentage: 50,
});

export const getDiscount = (
	clientWantsADiscount: boolean,
	contributionAmount: number,
	supporterPlusPrice: number,
	billingPeriod: BillingPeriod,
	subscriptionStatus: string,
	invoiceBalance: number,
	stage: Stage,
): Discount | undefined => {
	const isEligibleForDiscount =
		clientWantsADiscount &&
		contributionAmount <= supporterPlusPrice &&
		billingPeriod === 'Annual' &&
		subscriptionStatus === 'Active' &&
		invoiceBalance === 0;
	if (isEligibleForDiscount) {
		console.log('Subscription is eligible for discount');
		return annualContribHalfPriceSupporterPlusForOneYear(stage);
	}
	console.log('Subscription is not eligible for discount');
	return;
};
