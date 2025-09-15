import {
	countryGroupBySupportInternationalisationId,
	SupportInternationalisationId,
} from '@modules/internationalisation/countryGroup';
import { getIfDefined } from '@modules/nullAndUndefined';
import { getPromotionByCode } from './getPromotions';
import type { AppliedPromotion, Promotion } from './schema';
import { intersection } from '@modules/arrayFunctions';
import { ValidationError } from '@modules/errors';

export const validatePromotion = (
	promotions: Promotion[],
	appliedPromotion: AppliedPromotion,
	productRatePlanId: string,
) => {
	const promotion = getIfDefined(
		getPromotionByCode(promotions, appliedPromotion.promoCode),
		'No promotion found for code ' + appliedPromotion.promoCode,
	);

	checkPromotionIsActive(promotion);
	validateForCountryGroup(promotion, appliedPromotion.countryGroupId);
	validateProductRatePlan(promotion, productRatePlanId);
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
const validateForCountryGroup = (
	promotion: Promotion,
	countryGroupId: SupportInternationalisationId,
) => {
	const countryGroup =
		countryGroupBySupportInternationalisationId(countryGroupId);

	if (
		intersection([...promotion.appliesTo.countries], countryGroup.countries)
			.length === 0
	) {
		throw new ValidationError(
			`Promotion ${promotion.name} is not valid for country group ${countryGroupId}`,
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
