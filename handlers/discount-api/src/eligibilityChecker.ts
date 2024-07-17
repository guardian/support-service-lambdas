import { ValidationError } from '@modules/errors';
import { getIfDefined } from '@modules/nullAndUndefined';
import type { SimpleInvoiceItem } from '@modules/zuora/billingPreview';
import { getNextInvoiceTotal } from '@modules/zuora/billingPreview';
import type { ZuoraSubscription } from '@modules/zuora/zuoraSchemas';
import type { ZuoraCatalogHelper } from '@modules/zuora-catalog/zuoraCatalog';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

export class EligibilityChecker {
	constructor(private subscriptionNumber: string) {}

	assertGenerallyEligible = (
		subscription: ZuoraSubscription,
		accountBalance: number,
		nextInvoiceItems: SimpleInvoiceItem[],
	) => {
		console.log('Checking basic eligibility for the subscription');
		this.assertValidState(
			subscription.status === 'Active',
			validationRequirements.isActive,
			subscription.status,
		);
		this.assertValidState(
			accountBalance === 0,
			validationRequirements.zeroAccountBalance,
			`${accountBalance}`,
		);

		console.log('Working out the date to apply the discount');
		this.assertValidState(
			nextInvoiceItems.every((item) => item.amount >= 0),
			validationRequirements.noNegativePreviewItems,
			JSON.stringify(nextInvoiceItems),
		);

		console.log('Subscription is generally eligible for the discount');
	};

	assertNextPaymentIsAtCatalogPrice = (
		catalog: ZuoraCatalogHelper,
		invoiceItems: SimpleInvoiceItem[],
		discountableProductRatePlanId: string,
		currency: string,
	) => {
		const catalogPrice = catalog.getCatalogPrice(
			discountableProductRatePlanId,
			currency,
		);

		// Work out how much the cost of the next invoice will be
		const nextInvoiceTotal = getIfDefined(
			getNextInvoiceTotal(invoiceItems),
			`No next invoice found for account containing ${this.subscriptionNumber}`,
		);

		this.assertValidState(
			nextInvoiceTotal >= catalogPrice,
			validationRequirements.atLeastCatalogPrice + ' of ' + catalogPrice,
			nextInvoiceTotal + ' ' + currency,
		);
	};

	assertEligibleForFreePeriod = (
		discountProductRatePlanId: string,
		subscription: ZuoraSubscription,
		now: Dayjs,
	) => {
		const eligibilityChecker = new EligibilityChecker(
			subscription.subscriptionNumber,
		);
		eligibilityChecker.assertValidState(
			dayjs(subscription.contractEffectiveDate).add(2, 'months').isBefore(now),
			validationRequirements.twoMonthsMin,
			subscription.contractEffectiveDate.toDateString(),
		);
		eligibilityChecker.assertValidState(
			subscription.ratePlans.every(
				(rp) => rp.productRatePlanId !== discountProductRatePlanId,
			),
			validationRequirements.notAlreadyUsed,
			discountProductRatePlanId,
		);
	};

	assertValidState = (isValid: boolean, message: string, actual: string) => {
		console.log(
			`Asserting that ${this.subscriptionNumber} - <` + message + '>',
		);
		if (!isValid) {
			throw new ValidationError(
				`Subscription ${this.subscriptionNumber} did not meet precondition <` +
					message +
					'>' +
					` (was ${actual})`,
			);
		}
	};
}

export const validationRequirements = {
	twoMonthsMin: 'subscription was taken out more than 2 months ago',
	notAlreadyUsed: 'this discount has not already been used',
	noNegativePreviewItems: `next invoice has no negative items`,
	isActive: 'subscription status is active',
	zeroAccountBalance: 'account balance is zero',
	atLeastCatalogPrice: 'next invoice must be at least the catalog price',
};
