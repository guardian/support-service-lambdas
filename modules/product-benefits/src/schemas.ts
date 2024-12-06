import { z } from 'zod';

const productBenefitSchema = z.union([
	z.literal('feastApp'),
	z.literal('adFree'),
	z.literal('newspaperArchive'),
	z.literal('newspaperEdition'),
	z.literal('guardianWeeklyEdition'),
	z.literal('liveApp'),
	z.literal('fewerSupportAsks'),
	z.literal('rejectTracking'),
	z.literal('liveEvents'), // Do we need this?
]);

export type ProductBenefit = z.infer<typeof productBenefitSchema>;

const trialSchema = z.object({
	iosSubscriptionGroup: z.string(),
	androidOfferTag: z.string(),
});
export type Trial = z.infer<typeof trialSchema>;
const trialInformationSchema = z.record(productBenefitSchema, trialSchema);
export type TrialInformation = z.infer<typeof trialInformationSchema>;

export const userBenefitsSchema = z.object({
	benefits: z.array(productBenefitSchema),
	trials: trialInformationSchema,
});

export type UserBenefitsResponse = z.infer<typeof userBenefitsSchema>;
