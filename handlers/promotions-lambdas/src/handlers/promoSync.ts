import type {
	DiscountPromotionType,
	PromotionType,
} from '@modules/promotions/v1/schema';
import { promotionSchema as oldPromoSchema } from '@modules/promotions/v1/schema';
import type { Promo } from '@modules/promotions/v2/schema';
import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import { z } from 'zod';
import { createSyncHandler } from '../lib/syncHandler';

const isDiscountPromotion = (
	promotionType: PromotionType,
): promotionType is DiscountPromotionType => {
	return promotionType.name === 'percent_discount';
};

// modify the existing schema because the use of Sets confuses typescript
const oldDynamoPromoSchema = oldPromoSchema.extend({
	appliesTo: z.object({
		productRatePlanIds: z.array(z.string()),
		countries: z.array(z.string()),
	}),
});
type OldPromo = z.infer<typeof oldDynamoPromoSchema>;

// Build a new Promo item for each promo code in the old data
const transformPromo = (oldPromo: OldPromo): Promo[] => {
	const promoCodes = Object.values(oldPromo.codes).flat();

	if (promoCodes.length === 0) {
		logger.log(
			`Promo ${oldPromo.name} has no promo codes. No items will be added to the new table.`,
		);
	}

	return promoCodes.map((promoCode) => {
		const promo: Promo = {
			promoCode: promoCode,
			name: `${oldPromo.name} - ${promoCode}`,
			campaignCode: oldPromo.campaignCode,
			appliesTo: {
				productRatePlanIds: oldPromo.appliesTo.productRatePlanIds,
				// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- the old schema only uses string
				countries: oldPromo.appliesTo
					.countries as Promo['appliesTo']['countries'],
			},
			startTimestamp: oldPromo.starts.toISOString(),
		};

		if (oldPromo.expires) {
			promo.endTimestamp = oldPromo.expires.toISOString();
		}

		if (isDiscountPromotion(oldPromo.promotionType)) {
			promo.discount = {
				amount: oldPromo.promotionType.amount,
				durationMonths: oldPromo.promotionType.durationMonths ?? 0,
			};
		}

		if (oldPromo.description) {
			promo.description = oldPromo.description;
		}

		if (oldPromo.landingPage) {
			const landingPage: Promo['landingPage'] = {};

			if (oldPromo.landingPage.title) {
				landingPage.title = oldPromo.landingPage.title;
			}
			if (oldPromo.landingPage.description) {
				landingPage.description = oldPromo.landingPage.description;
			}
			if (oldPromo.landingPage.roundelHtml) {
				landingPage.roundelHtml = oldPromo.landingPage.roundelHtml;
			}

			promo.landingPage = landingPage;
		}

		return promo;
	});
};

export const handler = createSyncHandler({
	sourceSchema: oldDynamoPromoSchema,
	transform: transformPromo,
	getTableName: (stage: Stage) => `support-admin-console-promos-${stage}`,
});
