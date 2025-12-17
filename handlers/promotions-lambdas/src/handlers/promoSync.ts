import type { Promo } from '@modules/promotions/v2/schema';
import type { Stage } from '@modules/stage';
import { z } from 'zod';
import { createSyncHandler } from '../lib/syncHandler';

const oldPromoSchema = z.object({
	campaignCode: z.string(),
});

type OldPromoModel = z.infer<typeof oldPromoSchema>;

const transformPromo = (oldPromo: OldPromoModel): Promo => ({
	// TODO - complete
	promoCode: '',
	name: '',
	campaignCode: oldPromo.campaignCode,
	appliesTo: {
		productRatePlanIds: [],
		countryGroups: [],
	},
	startTimestamp: '',
});

export const handler = createSyncHandler({
	sourceSchema: oldPromoSchema,
	transform: transformPromo,
	getTableName: (stage: Stage) => `support-admin-console-promos-${stage}`,
	getPrimaryKey: (campaign: Promo) => ({
		campaignCode: campaign.campaignCode,
	}),
});
