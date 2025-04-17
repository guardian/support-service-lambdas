import type { BillingPeriod } from '@modules/billingPeriod';
import type { Stage } from '@modules/stage';
import {
	billingPreviewToSimpleInvoiceItems,
	getBillingPreview,
} from '@modules/zuora/billingPreview';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';

export type Discount = {
	// the following fields match the charge in the zuora catalog
	// https://knowledgecenter.zuora.com/Zuora_Platform/API/G_SOAP_API/E1_SOAP_API_Object_Reference/ProductRatePlanCharge
	productRatePlanId: string;
	productRatePlanChargeId: string;
	name: string;
	upToPeriods: number;
	upToPeriodsType: 'Months' | 'Years';
	discountPercentage: number;
};

const annualContribHalfPriceSupporterPlusForOneYear = (
	stage: Stage,
): Discount => ({
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
	clientWantsADiscount: boolean,
	oldContributionAmount: number,
	supporterPlusPrice: number,
	billingPeriod: BillingPeriod,
	subscriptionStatus: string,
	accountNumber: string,
	invoiceBalance: number,
	stage: Stage,
	zuoraClient: ZuoraClient,
): Promise<Discount | undefined> => {
	const discuntDetails = annualContribHalfPriceSupporterPlusForOneYear(stage);
	const discountedPrice =
		supporterPlusPrice * (discuntDetails.discountPercentage / 100);

	const subIsActive = subscriptionStatus === 'Active';

	if (subIsActive) {
		const getBillingPreviewResponse = await getBillingPreview(
			zuoraClient,
			dayjs().add(13, 'months'),
			accountNumber,
		);

		const nextInvoiceItems = billingPreviewToSimpleInvoiceItems(
			getBillingPreviewResponse,
		);
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
			console.log('Subscription is eligible for discount');
			return discuntDetails;
		}
		console.log('Subscription is not eligible for discount');
		return;
	}
	console.log('Subscription is not eligible for discount');
	return;
};
