import {
	PromoCampaign, promoCampaignSchema,
	promoProductSchema,
} from '@modules/promotions/v2/schema';
import type { Stage } from '@modules/stage';
import { z } from 'zod';
import { createSyncHandler } from '../lib/syncHandler';

const oldPromoCampaignSchema = z.object({
	code: z.string(),
	group: z.enum([
		'supporterPlus',
		'tierThree',
		'digitalpack',
		'newspaper',
		'weekly',
	]),
	name: z.string(),
});

type OldPromoCampaignModel = z.infer<typeof oldPromoCampaignSchema>;

const productGroupMapping: Record<
	OldPromoCampaignModel['group'],
	PromoCampaign['product']
> = {
	supporterPlus: 'SupporterPlus',
	tierThree: 'TierThree',
	digitalpack: 'DigitalSubscription',
	newspaper: 'Newspaper',
	weekly: 'Weekly',
};

const transformCampaign = (
	oldCampaign: OldPromoCampaignModel,
): PromoCampaign[] => [
	{
		campaignCode: oldCampaign.code,
		product: productGroupMapping[oldCampaign.group],
		name: oldCampaign.name,
		created: new Date().toISOString(),
	},
];

export const handler = createSyncHandler({
	sourceSchema: oldPromoCampaignSchema,
	transform: transformCampaign,
	getTableName: (stage: Stage) =>
		`support-admin-console-promo-campaigns-${stage}`,
});
