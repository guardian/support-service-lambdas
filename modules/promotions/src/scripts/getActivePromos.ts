import { writeFileSync } from 'fs';
import { getPromotions } from '../v1/getPromotions';
import type {DiscountPromotionType, Promotion, PromotionType} from '../v1/schema';
import type { Stage } from '@modules/stage';

const isDiscountPromotion = (
    promotionType: PromotionType,
): promotionType is DiscountPromotionType => {
    return promotionType.name === 'percent_discount';
};

const filterPromotions = (promotions: Promotion[]): Promotion[] => {
  const now = new Date();
  return promotions.filter((promo) => {
    const isPercentDiscount = isDiscountPromotion(promo.promotionType);
    const isNotExpired = promo.expires === undefined || new Date(promo.expires) > now;
    return isPercentDiscount && isNotExpired;
  });
};

const convertToCSV = (promotions: Promotion[]): string => {
  const headers = ['uuid', 'promoCode', 'campaignCode', 'starts', 'expires', 'name', 'description'];
  const rows = promotions.flatMap((promo) => {
    const allCodes = Object.values(promo.codes).flat();
    return allCodes.map((code) => [
      promo.uuid,
      code,
      promo.campaignCode,
      promo.starts.toISOString(),
      promo.expires?.toISOString() ?? '',
      promo.name,
      promo.description,
    ].map((field) => `"${field}"`).join(','));
  });

  return [headers.join(','), ...rows].join('\n');
};

const main = async () => {
  const stage: Stage = process.argv[2] as Stage;
  if (!stage) {
    throw new Error('Stage parameter is required');
  }

  const promotions = await getPromotions(stage);
  console.log('Promotions', promotions.length);
  const filtered = filterPromotions(promotions);
  const csv = convertToCSV(filtered);

  writeFileSync('promotions.csv', csv);
  console.log(`Exported ${filtered.length} promotions to promotions.csv`);
};

main().catch(console.error);