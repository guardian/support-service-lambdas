import { z } from 'zod';

const productBenefitSchema = z.enum([
	'feastApp',
	'adFree',
	'newspaperArchive',
	'newspaperEdition',
	'guardianWeeklyEdition',
	'liveApp',
	'fewerSupportAsks',
	'rejectTracking',
	'liveEvents',
]);

export type ProductBenefit = z.infer<typeof productBenefitSchema>;

export const allProductBenefits: ProductBenefit[] =
	productBenefitSchema.options;

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
