import { ValidationError } from '@modules/errors';
import type { Lazy } from '@modules/lazy';
import { getIfDefined } from '@modules/nullAndUndefined';
import { logger } from '@modules/routing/logger';
import type { SimpleInvoiceItem } from '@modules/zuora/billingPreview';
import { getNextInvoiceTotal } from '@modules/zuora/billingPreview';
import type { ZuoraAccount, ZuoraSubscription } from '@modules/zuora/types';
import type { ZuoraCatalogHelper } from '@modules/zuora-catalog/zuoraCatalog';
import dayjs from 'dayjs';
import type { Discount, EligibilityCheck } from './discountTypes';

export function assertValidState(
	isValid: boolean,
	message: string,
	actual: string,
): asserts isValid {
	logger.log(`Asserting <${message}>`);
	if (!isValid) {
		logger.log(
			`FAILED: subscription did not meet precondition <${message}> (was ${actual})`,
		);
		throw new ValidationError(
			`subscription did not meet precondition <${message}> (was ${actual})`,
		);
	}
}
type BBB = { name: string; fn: EligibilityFunction };

class CCC<T> {
	constructor(
		public name: string,
		public check: (t: T) => EligibilityFunctionResult,
		public extract: (props: EligibilityFunctionProps) => Promise<T>,
	) {}

	fn = (props: EligibilityFunctionProps): Promise<EligibilityFunctionResult> =>
		this.extract(props).then(this.check);
}

const twoMonthsMin = new CCC(
	'subscription was taken out more than 2 months ago',
	({ subscription, today }) => ({
		isValid: dayjs(subscription.contractEffectiveDate)
			.add(2, 'months')
			.isBefore(today),
		actual: subscription.contractEffectiveDate.toDateString(),
	}),
	(props: EligibilityFunctionProps) =>
		Promise.resolve({
			subscription: props.subscription,
			today: props.today,
		}),
);

const notAlreadyUsed = new CCC(
	'this discount has not already been used',
	({ ratePlans, discountProductRatePlanId }) => ({
		isValid: ratePlans.every(
			(rp) => rp.productRatePlanId !== discountProductRatePlanId,
		),
		actual: discountProductRatePlanId,
	}),
	(props: EligibilityFunctionProps) =>
		Promise.resolve({
			discountProductRatePlanId: props.discount.productRatePlanId,
			ratePlans: props.subscription.ratePlans,
		}),
);

const noNegativePreviewItems = new CCC(
	`next invoice has no negative items`,
	(nextInvoiceItems: SimpleInvoiceItem[]) => ({
		isValid: nextInvoiceItems.every((item) => item.amount >= 0),
		actual: JSON.stringify(nextInvoiceItems),
	}),
	async (props: EligibilityFunctionProps) =>
		await props.lazyBillingPreview.get(),
);

const isActive = new CCC(
	'subscription status is active',
	(status: string) => ({
		isValid: status === 'Active',
		actual: status,
	}),
	(props: EligibilityFunctionProps) =>
		Promise.resolve(props.subscription.status),
);

const zeroAccountBalance = new CCC(
	'account balance is zero',
	(accountBalance: number) => ({
		isValid: accountBalance === 0,
		actual: `${accountBalance}`,
	}),
	(props: EligibilityFunctionProps) =>
		Promise.resolve(props.account.metrics.totalInvoiceBalance),
);

export const atLeastCatalogPrice = new CCC(
	'next invoice must be at least the catalog price',
	({ catalog, invoiceItems, discountableProductRatePlanId, currency }) => {
		const catalogPrice = catalog.getCatalogPrice(
			discountableProductRatePlanId,
			currency,
		);

		// Work out how much the cost of the next invoice will be
		const nextInvoiceTotal = getIfDefined(
			getNextInvoiceTotal(invoiceItems),
			`No next invoice found for account containing this subscription`,
		);

		return {
			isValid: nextInvoiceTotal >= catalogPrice,
			actual: nextInvoiceTotal + ' ' + currency + ' of ' + catalogPrice,
		};
	},
	async (props: EligibilityFunctionProps) => ({
		catalog: await props.catalog(),
		invoiceItems: await props.lazyBillingPreview.get(),
		discountableProductRatePlanId: props.discount.productRatePlanId,
		currency: props.account.metrics.currency,
	}),
);

const nextInvoiceGreaterThanZero = new CCC(
	'next invoice total must be greater than zero',
	(nextInvoiceItems: SimpleInvoiceItem[]) => {
		const nextInvoiceTotal = nextInvoiceItems
			.map((item) => item.amount)
			.reduce((a, b) => a + b);
		return {
			isValid: nextInvoiceTotal > 0,
			actual: JSON.stringify(nextInvoiceItems),
		};
	},
	async (props: EligibilityFunctionProps) =>
		await props.lazyBillingPreview.get(),
);

export const mustHaveDiscountDefined = {
	name: 'subscription must have a discount defined',
	// fn: undefined, // TODO work out how to integrate this
};
export const validationRequirements = {
	twoMonthsMin,
	notAlreadyUsed,
	noNegativePreviewItems,
	isActive,
	zeroAccountBalance,
	atLeastCatalogPrice,
	nextInvoiceGreaterThanZero,
	mustHaveDiscountDefined,
};

const generalEligibility: BBB[] = [
	isActive,
	zeroAccountBalance,
	noNegativePreviewItems,
	nextInvoiceGreaterThanZero,
];

export const aaa: Record<EligibilityCheck, BBB[]> = {
	AtCatalogPrice: [...generalEligibility, atLeastCatalogPrice],
	EligibleForFreePeriod: [...generalEligibility, twoMonthsMin, notAlreadyUsed],
	NoCheck: [...generalEligibility],
	NoRepeats: [...generalEligibility, notAlreadyUsed],
};

type EligibilityFunctionProps = {
	today: dayjs.Dayjs;
	catalog: () => Promise<ZuoraCatalogHelper>;
	discount: Discount;
	account: ZuoraAccount;
	subscription: ZuoraSubscription;
	lazyBillingPreview: Lazy<SimpleInvoiceItem[]>;
	discountableProductRatePlanId: string;
};

type EligibilityFunctionResult = {
	isValid: boolean;
	actual: string;
};
type EligibilityFunction = (
	props: EligibilityFunctionProps,
) => Promise<EligibilityFunctionResult>;

export const ccc: (props: EligibilityFunctionProps) => Promise<void> = async (
	props: EligibilityFunctionProps,
) => {
	logger.log('starting check ' + props.discount.eligibilityCheckForRatePlan);

	// has to be "for" rather than "Promise.all" as the order matters
	for (const bbb of aaa[props.discount.eligibilityCheckForRatePlan]) {
		logger.log('starting sub check ' + bbb.name);
		const output = await bbb.fn(props);
		assertValidState(output.isValid, bbb.name, output.actual);
	}
	logger.log('finished check ' + props.discount.eligibilityCheckForRatePlan);
};
