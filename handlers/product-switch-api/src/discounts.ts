import type { BillingPeriod } from '@modules/billingPeriod';
import type { Lazy } from '@modules/lazy';
import type { Logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import type { SimpleInvoiceItem } from '@modules/zuora/billingPreview';

export type Discount = {
	// Zuora discount API reference:
	// https://developer.zuora.com/v1-api-reference/api/operation/GET_ProductRatePlans/
	productRatePlanId: string;
	productRatePlanChargeId: string;
	name: string;
	upToPeriods: number;
	upToPeriodsType: 'Months' | 'Years';
	discountPercentage: number;
	discountedPrice: number;
};

type PartialDiscount = Omit<Discount, 'discountedPrice'>;

const annualContribHalfPriceSupporterPlusForOneYear = (
	stage: Stage,
): PartialDiscount => ({
	productRatePlanId:
		stage === 'PROD'
			? '8a12994695aa4f680195ae2dc9d221d8'
			: '71a1383e2b395842e6f58a2754ad00c1',
	productRatePlanChargeId:
		stage === 'PROD'
			? '8a1280be95aa24270195ae3039934db7'
			: '71a116628da95844dde58a2a18ef0059',
	name: 'Cancellation Save - Annual Contribution to Supporter Plus Switch 50% off 1 year',
	upToPeriods: 1,
	upToPeriodsType: 'Years',
	discountPercentage: 50,
});

export const getDiscount = async (
	logger: Logger,
	clientWantsADiscount: boolean,
	oldContributionAmount: number,
	supporterPlusPrice: number,
	billingPeriod: BillingPeriod,
	subscriptionStatus: string,
	invoiceBalance: number,
	stage: Stage,
	lazyBillingPreview: Lazy<SimpleInvoiceItem[]>,
): Promise<Discount | undefined> => {
	const discountDetails = annualContribHalfPriceSupporterPlusForOneYear(stage);
	const discountedPrice =
		(supporterPlusPrice * (100 - discountDetails.discountPercentage)) / 100;

	const subIsActive = subscriptionStatus === 'Active';

	if (subIsActive) {
		const nextInvoiceItems = await lazyBillingPreview.get();

		const hasUpcomingDiscount = nextInvoiceItems.some(
			(invoiceItem) => invoiceItem.amount < 0,
		);

		const isEligibleForDiscount =
			clientWantsADiscount &&
			oldContributionAmount <= discountedPrice &&
			billingPeriod === 'Annual' &&
			invoiceBalance === 0 &&
			!hasUpcomingDiscount;

		if (isEligibleForDiscount) {
			logger.log('Subscription is eligible for discount');
			return { ...discountDetails, discountedPrice };
		}
		logger.log('Subscription is not eligible for discount - sub is Active');
		return;
	}
	logger.log('Subscription is not eligible for discount - sub is NOT active');
	return;
};
