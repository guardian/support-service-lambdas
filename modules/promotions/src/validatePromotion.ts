import { intersection } from '@modules/arrayFunctions';
import { ValidationError } from '@modules/errors';
import type { SupportRegionId } from '@modules/internationalisation/countryGroup';
import { countryGroupBySupportRegionId } from '@modules/internationalisation/countryGroup';
import { getIfDefined } from '@modules/nullAndUndefined';
import { getPromotionByCode } from './getPromotions';
import type {
	AppliedPromotion,
	DiscountPromotionType,
	Promotion,
	PromotionType,
} from './schema';

export type ValidatedPromotion = {
	discountPercentage: number;
	durationInMonths?: number;
	promoCode: string;
};

export const validatePromotion = (
	promotions: Promotion[],
	appliedPromotion: AppliedPromotion,
	productRatePlanId: string,
): ValidatedPromotion => {
	const promotion = getIfDefined(
		getPromotionByCode(promotions, appliedPromotion.promoCode),
		'No promotion found for code ' + appliedPromotion.promoCode,
	);

	checkPromotionIsActive(promotion);
	if (!isDiscountPromotion(promotion.promotionType)) {
		throw new ValidationError(
			`${promotion.name} is a ${promotion.promotionType.name} promotion these are no longer supported`,
		);
	}
	checkDiscountHasDuration(promotion.promotionType);
	validateForCountryGroup(promotion, appliedPromotion.supportRegionId);
	validateProductRatePlan(promotion, productRatePlanId);
	return {
		discountPercentage: promotion.promotionType.amount,
		durationInMonths: promotion.promotionType.durationMonths,
		promoCode: appliedPromotion.promoCode,
	};
};

const checkPromotionIsActive = (promotion: Promotion) => {
	const now = new Date();
	if (promotion.starts > now) {
		throw new ValidationError(
			`Promotion ${promotion.name} is not yet active, starts on ${promotion.starts.toISOString()}`,
		);
	}
	if (promotion.expires && promotion.expires <= now) {
		throw new ValidationError(
			`Promotion ${promotion.name} expired on ${promotion.expires.toISOString()}`,
		);
	}
};
const checkDiscountHasDuration = (promotionType: DiscountPromotionType) => {
	if (promotionType.durationMonths === undefined) {
		throw new ValidationError(
			`Promotion ${promotionType.name} is missing durationMonths. Perpetual discounts are not allowed`,
		);
	}
};
const isDiscountPromotion = (
	promotionType: PromotionType,
): promotionType is DiscountPromotionType => {
	return promotionType.name === 'percent_discount';
};
const validateForCountryGroup = (
	promotion: Promotion,
	supportRegionId: SupportRegionId,
) => {
	const countryGroup = countryGroupBySupportRegionId(supportRegionId);

	if (
		intersection([...promotion.appliesTo.countries], countryGroup.countries)
			.length === 0
	) {
		throw new ValidationError(
			`Promotion ${promotion.name} is not valid for country group ${countryGroup.name}`,
		);
	}
};
const validateProductRatePlan = (
	promotion: Promotion,
	productRatePlanId: string,
) => {
	if (!promotion.appliesTo.productRatePlanIds.has(productRatePlanId)) {
		throw new ValidationError(
			`Promotion ${promotion.name} is not valid for product rate plan ${productRatePlanId}`,
		);
	}
};
