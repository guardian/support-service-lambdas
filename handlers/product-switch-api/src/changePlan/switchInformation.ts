import { ValidationError } from '@modules/errors';
import type { IsoCurrency } from '@modules/internationalisation/currency';
import type { Lazy } from '@modules/lazy';
import {
	CommonRatePlan,
	Product,
	ProductCatalog,
	ProductKey,
	ProductRatePlanKey,
} from '@modules/product-catalog/productCatalog';
import type { Stage } from '@modules/stage';
import type { SimpleInvoiceItem } from '@modules/zuora/billingPreview';
import {
	RatePlanCharge,
	ZuoraAccount,
	ZuoraSubscription,
} from '@modules/zuora/types';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import {
	buildSourceProduct,
	buildTargetProduct,
	CatalogInformation,
} from '../catalogInformation';
import type { Discount } from '../discounts';
import { getDiscount } from '../discounts';
import type {
	ProductSwitchGenericRequestBody,
	ProductSwitchRequestBody,
} from '../schemas';
import { objectValues } from '@modules/objectFunctions';
import { sumNumbers } from '@modules/arrayFunctions';
import {
	isProductSupported,
	isValidTargetBillingPeriod,
	switchesForProduct,
	ValidTargetZuoraBillingPeriod,
	ValidTargetGuardianProductName,
} from '../validSwitches';
import { ZuoraCatalog } from '@modules/zuora-catalog/zuoraCatalogSchema';
import { logger } from '@modules/routing/logger';
import { HighLevelSubParser, GuardianSubscription } from './highLevelSubParser';
import { SubscriptionFilter } from './subscriptionFilter';
import {
	asSinglePlanGuardianSub,
	GuardianCatalogKeys,
	SinglePlanGuardianSubscription,
} from './singlePlanGuardianSub';
import { getIfDefined } from '@modules/nullAndUndefined';

export type AccountInformation = {
	id: string;
	identityId: string;
	emailAddress: string;
	firstName: string;
	lastName: string;
	defaultPaymentMethodId: string;
};

export type SubscriptionInformation = {
	accountNumber: string;
	subscriptionNumber: string;
	previousProductName: string;
	previousRatePlanName: string;
	previousAmount: number;
	currency: IsoCurrency;
	billingPeriod: ValidTargetZuoraBillingPeriod;
};

export type SwitchInformation = {
	stage: Stage;
	input: ProductSwitchRequestBody;
	startNewTerm: boolean;
	targetContribution?: TargetContribution;
	actualTotalPrice: number;
	account: AccountInformation;
	subscription: SubscriptionInformation;
	catalog: CatalogInformation;
	discount?: Discount;
};

const getAccountInformation = (account: ZuoraAccount): AccountInformation => {
	return {
		id: account.basicInfo.id,
		identityId: account.basicInfo.identityId,
		emailAddress: account.billToContact.workEmail,
		firstName: account.billToContact.firstName,
		lastName: account.billToContact.lastName,
		defaultPaymentMethodId: account.billingAndPayment.defaultPaymentMethodId,
	};
};

export type TargetContribution = {
	contributionAmount: number;
	chargeId: string;
};
type SinglePlanGuardianProduct<P extends ProductKey> = Omit<
	Product<P>,
	'ratePlans'
> & {
	ratePlan: CommonRatePlan;
};

/**
 * Takes a low level subscription and returns a simplified sub with a single current plan, and its associated
 * guardian product catalog product
 */
class ZuoraToGuardianSubscriptionParser {
	constructor(
		zuoraCatalog: ZuoraCatalog,
		private productCatalog: ProductCatalog,
		today: dayjs.Dayjs,
	) {
		this.highLevelSubParser = new HighLevelSubParser(zuoraCatalog);
		this.subscriptionFilter =
			SubscriptionFilter.activeCurrentSubscriptionFilter(today);
	}

	private highLevelSubParser: HighLevelSubParser;

	private subscriptionFilter: SubscriptionFilter;

	getSinglePlanGuardianSubscriptionOrThrow(
		zuoraSubscription: ZuoraSubscription,
	): {
		guardianCatalogKeys: GuardianCatalogKeys<ProductKey>;
		singlePlanGuardianSubscription: SinglePlanGuardianSubscription;
		singlePlanGuardianProduct: SinglePlanGuardianProduct<ProductKey>;
	} {
		const highLevelSub: GuardianSubscription =
			this.highLevelSubParser.asHighLevelSub(zuoraSubscription);

		const subWithCurrentPlans: GuardianSubscription =
			this.subscriptionFilter.filterSubscription(highLevelSub);

		// got SupporterPlus Annual (keys for the product catalog) and then the whole object
		const { productCatalogKeys, ...singlePlanSub } =
			asSinglePlanGuardianSub(subWithCurrentPlans);
		logger.log('this is a ', productCatalogKeys);
		const productKey: ProductKey = productCatalogKeys.productKey;
		const { ratePlans, ...guardianProduct } = this.productCatalog[productKey];
		const productRatePlanKey: ProductRatePlanKey<typeof productKey> =
			productCatalogKeys.productRatePlanKey;
		const guardianProductRatePlan: CommonRatePlan =
			ratePlans[productRatePlanKey];

		const guardianProductWithRatePlan: SinglePlanGuardianProduct<ProductKey> = {
			ratePlan: guardianProductRatePlan,
			...guardianProduct,
		};
		return {
			guardianCatalogKeys: productCatalogKeys,
			singlePlanGuardianSubscription: singlePlanSub,
			singlePlanGuardianProduct: guardianProductWithRatePlan,
		};
	}
}

function getSwitchOrThrow(
	zuoraCatalog: ZuoraCatalog,
	productCatalog: ProductCatalog,
	today: dayjs.Dayjs,
	zuoraSubscription: ZuoraSubscription,
	input: ProductSwitchGenericRequestBody,
): {
	guardianCatalogKeys: GuardianCatalogKeys<ProductKey>;
	singlePlanGuardianSubscription: SinglePlanGuardianSubscription;
	zuoraBillingPeriod: ValidTargetZuoraBillingPeriod;
	targetGuardianProductName: ValidTargetGuardianProductName;
	singlePlanGuardianProduct: SinglePlanGuardianProduct<ProductKey>;
} {
	const {
		guardianCatalogKeys,
		singlePlanGuardianSubscription,
		singlePlanGuardianProduct,
	} = new ZuoraToGuardianSubscriptionParser(
		zuoraCatalog,
		productCatalog,
		today,
	).getSinglePlanGuardianSubscriptionOrThrow(zuoraSubscription);

	// should we be aggregating from the actual sub rather than using the catalog one?
	const billingPeriod = singlePlanGuardianProduct.ratePlan.billingPeriod;

	if (!isProductSupported(guardianCatalogKeys.productKey)) {
		throw new ValidationError(
			`unsupported source product for switching: ${guardianCatalogKeys.productKey}`,
		);
	}
	const availableSwitchesForSub =
		switchesForProduct[guardianCatalogKeys.productKey];

	const targetProduct: ValidTargetGuardianProductName = input.targetProduct;
	const validBillingPeriodsForSwitch = availableSwitchesForSub[targetProduct];

	if (
		billingPeriod === undefined ||
		!isValidTargetBillingPeriod(billingPeriod) ||
		!validBillingPeriodsForSwitch.includes(billingPeriod)
	) {
		throw new ValidationError(
			`switch is not supported: from ${guardianCatalogKeys.productKey} to ${targetProduct} with billing period ${billingPeriod}`,
		);
	}
	return {
		guardianCatalogKeys: guardianCatalogKeys,
		singlePlanGuardianSubscription: singlePlanGuardianSubscription,
		zuoraBillingPeriod: billingPeriod,
		targetGuardianProductName: targetProduct,
		singlePlanGuardianProduct: singlePlanGuardianProduct,
	};
}

const getSwitchInformation = async (
	stage: Stage,
	input: ProductSwitchGenericRequestBody,
	subscription: ZuoraSubscription,
	account: ZuoraAccount,
	productCatalog: ProductCatalog,
	zuoraCatalog: ZuoraCatalog, // maybe ProductCatalog alone has enough information?
	lazyBillingPreview: Lazy<SimpleInvoiceItem[]>,
	today: Dayjs,
): Promise<SwitchInformation> => {
	const {
		guardianCatalogKeys,
		singlePlanGuardianSubscription,
		zuoraBillingPeriod,
		targetGuardianProductName,
		singlePlanGuardianProduct,
	} = getSwitchOrThrow(
		zuoraCatalog,
		productCatalog,
		today,
		subscription,
		input,
	);

	const userInformation = getAccountInformation(account);

	const targetProductRatePlan: CommonRatePlan =
		productCatalog[targetGuardianProductName].ratePlans[
			guardianCatalogKeys.productRatePlanKey
		];
	const catalogInformation: CatalogInformation = {
		targetProduct: buildTargetProduct(targetProductRatePlan),
		sourceProduct: buildSourceProduct(singlePlanGuardianProduct.ratePlan),
	};

	const currency = account.metrics
		.currency as keyof typeof targetProductRatePlan.pricing; //FIXME maybe need a runtime check?

	const catalogBasePrice: number = getIfDefined(
		targetProductRatePlan.pricing[currency],
		'No Supporter Plus price defined for currency',
	);

	const previousAmount = sumNumbers(
		objectValues(
			singlePlanGuardianSubscription.ratePlan.guardianRatePlanCharges,
		).flatMap((c: RatePlanCharge) => (c.price !== null ? [c.price] : [])),
	);

	const maybeDiscount = await getDiscount(
		!!input.applyDiscountIfAvailable,
		previousAmount,
		catalogBasePrice,
		zuoraBillingPeriod,
		subscription.status,
		account.metrics.totalInvoiceBalance,
		stage,
		lazyBillingPreview,
	);

	const actualBasePrice = maybeDiscount?.discountedPrice ?? catalogBasePrice;

	// newAmount is only passed in where the user is in the switch journey - for cancellation saves the new amount is discounted for the first year - they always get the base price (with discount)
	const userDesiredAmount = input.newAmount ?? previousAmount;

	// Validate that the user's desired amount is at least the base Supporter Plus price
	// Only validate when newAmount is explicitly provided by the frontend
	if (input.newAmount && userDesiredAmount < actualBasePrice) {
		throw new ValidationError(
			`Cannot switch to Supporter Plus: desired amount (${userDesiredAmount}) is less than the minimum Supporter Plus price (${actualBasePrice}). Use the members-data-api to modify contribution amounts instead.`,
		);
	}

	const contributionAmount = Math.max(0, userDesiredAmount - actualBasePrice);

	let targetContribution: TargetContribution | undefined;
	if (catalogInformation.targetProduct.contributionChargeId === undefined) {
		if (contributionAmount === 0) targetContribution = undefined;
		else
			throw new ValidationError(
				`target product has a fixed price of ${actualBasePrice} so it isn't possible to charge ${userDesiredAmount}`,
			);
	} else
		targetContribution = {
			contributionAmount,
			chargeId: catalogInformation.targetProduct.contributionChargeId,
		};

	const subscriptionInformation: SubscriptionInformation = {
		accountNumber: subscription.accountNumber,
		subscriptionNumber: subscription.subscriptionNumber,
		previousProductName: singlePlanGuardianSubscription.ratePlan.productName,
		previousRatePlanName: singlePlanGuardianSubscription.ratePlan.ratePlanName,
		previousAmount,
		currency,
		billingPeriod: zuoraBillingPeriod,
	};

	const termStartDate = dayjs(subscription.termStartDate).startOf('day');
	const startOfToday = today.startOf('day');
	const startNewTerm = termStartDate.isBefore(startOfToday);

	return {
		stage,
		input,
		startNewTerm,
		targetContribution,
		actualTotalPrice: contributionAmount + actualBasePrice,
		account: userInformation,
		subscription: subscriptionInformation,
		catalog: catalogInformation,
		discount: maybeDiscount,
	} satisfies SwitchInformation;
};
export default getSwitchInformation;
