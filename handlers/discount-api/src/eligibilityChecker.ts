import { ValidationError } from '@modules/errors';
import type { Logger } from '@modules/logger';
import { getIfDefined } from '@modules/nullAndUndefined';
import { getNextInvoiceTotal } from '@modules/zuora/billingPreview';
import type { SimpleInvoiceItem } from '@modules/zuora/billingPreview';
import type { ZuoraSubscription } from '@modules/zuora/types';
import type { ZuoraCatalogHelper } from '@modules/zuora-catalog/zuoraCatalog';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

export class EligibilityChecker {
	constructor(private logger: Logger) {}

	assertGenerallyEligible = async (
		subscription: ZuoraSubscription,
		accountBalance: number,
		getNextInvoiceItems: () => Promise<SimpleInvoiceItem[]>,
	) => {
		this.logger.log('Checking basic eligibility for the subscription');
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

		this.logger.log(
			'ensuring there are no refunds/discounts expected on the affected invoices',
		);
		const nextInvoiceItems = await getNextInvoiceItems();
		this.assertValidState(
			nextInvoiceItems.every((item) => item.amount >= 0),
			validationRequirements.noNegativePreviewItems,
			JSON.stringify(nextInvoiceItems),
		);

		this.logger.log(
			"making sure there's a payment due - avoid zero contribution amounts",
		);
		const nextInvoiceTotal = nextInvoiceItems
			.map((item) => item.amount)
			.reduce((a, b) => a + b);
		this.assertValidState(
			nextInvoiceTotal > 0,
			validationRequirements.nextInvoiceGreaterThanZero,
			JSON.stringify(nextInvoiceItems),
		);

		this.logger.log('Subscription is generally eligible for the discount');
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
			`No next invoice found for account containing this subscription`,
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
		this.assertValidState(
			dayjs(subscription.contractEffectiveDate).add(2, 'months').isBefore(now),
			validationRequirements.twoMonthsMin,
			subscription.contractEffectiveDate.toDateString(),
		);
		this.assertNoRepeats(discountProductRatePlanId, subscription);
	};

	assertNoRepeats = (
		discountProductRatePlanId: string,
		subscription: ZuoraSubscription,
	) => {
		this.assertValidState(
			subscription.ratePlans.every(
				(rp) => rp.productRatePlanId !== discountProductRatePlanId,
			),
			validationRequirements.notAlreadyUsed,
			discountProductRatePlanId,
		);
	};

	assertValidState = (isValid: boolean, message: string, actual: string) => {
		this.logger.log(`Asserting <${message}>`);
		if (!isValid) {
			throw new ValidationError(
				`subscription did not meet precondition <${message}> (was ${actual})`,
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
	nextInvoiceGreaterThanZero: 'next invoice total must be greater than zero',
};
