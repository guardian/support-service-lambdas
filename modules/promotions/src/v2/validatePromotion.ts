import { ValidationError } from '@modules/errors';
import type { SupportRegionId } from '@modules/internationalisation/countryGroup';
import { countryGroupBySupportRegionId } from '@modules/internationalisation/countryGroup';
import { logger } from '@modules/routing/logger';
import { intersection } from '@modules/arrayFunctions';
import type { Promo } from './schema';

export type ValidatedPromotion = {
  discountPercentage: number;
  durationInMonths?: number;
  promoCode: string;
};

export const validatePromotion = (
  promotion: Promo,
  supportRegionId: SupportRegionId,
  productRatePlanId: string,
): ValidatedPromotion => {
  logger.log(`Validating promotion ${promotion.promoCode}: `, promotion.name);

  checkPromotionIsActive(promotion);
  console.log(`${promotion.promoCode} is active`);

  checkDiscountHasDuration(promotion);
  console.log(
    `${promotion.promoCode} has a duration of ${promotion.discount?.durationMonths}`,
  );

  validateForCountryGroup(promotion, supportRegionId);
  console.log(
    `Promotion ${promotion.promoCode} is valid for country group ${supportRegionId}`,
  );

  validateProductRatePlan(promotion, productRatePlanId);
  console.log(
    `Promotion ${promotion.promoCode} is valid for product rate plan ${productRatePlanId}`,
  );

  return {
    discountPercentage: promotion.discount?.amount,
    durationInMonths: promotion.discount?.durationMonths,
    promoCode: promotion.promoCode,
  };
};

const checkPromotionIsActive = (promotion: Promo) => {
  const now = new Date();
  const startDate = new Date(promotion.startTimestamp);
  const endDate = promotion.endTimestamp ? new Date(promotion.endTimestamp) : null;

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

const checkDiscountHasDuration = (promotion: Promo) => {
  if (promotion.discount?.durationMonths === undefined) {
    throw new ValidationError(
      `Promotion ${promotion.promoCode} is missing durationMonths. Perpetual discounts are not allowed`,
    );
  }
};

const validateForCountryGroup = (
  promotion: Promo,
  supportRegionId: SupportRegionId,
) => {
  const countryGroup = countryGroupBySupportRegionId(supportRegionId);

  if (
    intersection([...promotion.appliesTo.countryGroups], countryGroup.countries).length === 0
  ) {
    throw new ValidationError(
      `Promotion ${promotion.name} is not valid for country group ${countryGroup.name}`,
    );
  }
};

const validateProductRatePlan = (
  promotion: Promo,
  productRatePlanId: string,
) => {
  if (!promotion.productRatePlanIds.has(productRatePlanId)) {
    throw new ValidationError(
      `Promotion ${promotion.name} is not valid for product rate plan ${productRatePlanId}`,
    );
  }
};