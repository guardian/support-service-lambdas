import { intersection } from '@modules/arrayFunctions';
import { ValidationError } from '@modules/errors';
import type { SupportRegionId } from '@modules/internationalisation/supportRegion';
import { supportRegions } from '@modules/internationalisation/supportRegion';
import { logger } from '@modules/logger/logger';
import type { AppliedPromotion, Promo } from './schema';

export type ValidatedPromotion = {
	discountPercentage: number;
	durationInMonths?: number;
	promoCode: string;
};

export const validatePromotion = (
	promotion: Promo | undefined,
	appliedPromotion: AppliedPromotion,
	productRatePlanId: string,
): ValidatedPromotion => {
	logger.log(`Validating promotion ${appliedPromotion.promoCode}`);

	if (!promotion) {
		throw new ValidationError(
			`No Promotion found for promo code ${appliedPromotion.promoCode}`,
		);
	}

	checkPromotionIsActive(promotion);
	logger.log(`${promotion.promoCode} is active`);

	checkHasDiscount(promotion);
	logger.log(
		`${promotion.promoCode} has a duration of ${promotion.discount.durationMonths}`,
	);

	validateForSupportRegion(promotion, appliedPromotion.supportRegionId);
	logger.log(
		`Promotion ${promotion.promoCode} is valid for country group ${appliedPromotion.supportRegionId}`,
	);

	validateProductRatePlan(promotion, productRatePlanId);
	logger.log(
		`Promotion ${promotion.promoCode} is valid for product rate plan ${productRatePlanId}`,
	);

	return {
		discountPercentage: promotion.discount.amount,
		durationInMonths: promotion.discount.durationMonths,
		promoCode: promotion.promoCode,
	};
};

const checkPromotionIsActive = (promotion: Promo) => {
	const now = new Date();
	const startDate = new Date(promotion.startTimestamp);
	const endDate = promotion.endTimestamp
		? new Date(promotion.endTimestamp)
		: null;

	if (startDate > now) {
		throw new ValidationError(
			`Promotion ${promotion.name} is not yet active, starts on ${startDate.toISOString()}`,
		);
	}
	if (endDate && endDate <= now) {
		throw new ValidationError(
			`Promotion ${promotion.name} expired on ${endDate.toISOString()}`,
		);
	}
};

function checkHasDiscount(
	promotion: Promo,
): asserts promotion is Promo & { discount: NonNullable<Promo['discount']> } {
	if (promotion.discount === undefined) {
		throw new ValidationError(
			`Promotion ${promotion.promoCode} is missing discount`,
		);
	}
}

const validateForSupportRegion = (
	promotion: Promo,
	supportRegionId: SupportRegionId,
) => {
	const supportRegion = supportRegions[supportRegionId];

	if (
		intersection([...promotion.appliesTo.countries], supportRegion.countries)
			.length === 0
	) {
		throw new ValidationError(
			`Promotion ${promotion.name} is not valid for support region ${supportRegion.name}`,
		);
	}
};

const validateProductRatePlan = (
	promotion: Promo,
	productRatePlanId: string,
) => {
	if (!promotion.appliesTo.productRatePlanIds.includes(productRatePlanId)) {
		throw new ValidationError(
			`Promotion ${promotion.name} is not valid for product rate plan ${productRatePlanId}`,
		);
	}
};
