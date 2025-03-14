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

const userBenefitsOverrideSchema = z.object({
	identityId: z.string(),
	benefits: z.array(productBenefitListSchema),
});

export const userBenefitsOverrideListSchema = z.object({
	userOverrides: z.array(userBenefitsOverrideSchema),
});

export type UserBenefitsOverrides = z.infer<
	typeof userBenefitsOverrideListSchema
>;

export type UserBenefitsResponse = z.infer<typeof userBenefitsSchema>;
