import { z } from 'zod';

export const productBenefitListSchema = z.enum([
	'feastApp',
	'adFree',
	'newspaperArchive',
	'newspaperEdition',
	'guardianWeeklyEdition',
	'liveApp',
	'hideSupportMessaging',
	'allowRejectAll',
	'liveEvents',
]);

export type ProductBenefit = z.infer<typeof productBenefitListSchema>;

const trialSchema = z.object({
	iosSubscriptionGroup: z.string(),
	androidOfferTag: z.string(),
});
export type Trial = z.infer<typeof trialSchema>;
const trialInformationSchema = z.record(productBenefitListSchema, trialSchema);
export type TrialInformation = z.infer<typeof trialInformationSchema>;

export const userBenefitsSchema = z.object({
	benefits: z.array(productBenefitListSchema),
	trials: trialInformationSchema,
});

export type UserBenefitsResponse = z.infer<typeof userBenefitsSchema>;
