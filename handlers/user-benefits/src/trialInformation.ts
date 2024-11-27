// This information is used by the apps to work out what offer to show to the user
import type { ProductBenefit } from './productBenefit';

export type TrialInformation = Partial<Record<ProductBenefit, Trial>>;

export type Trial = {
	iosSubscriptionGroup: string;
	androidOfferTag: string;
};

export const feastExtendedTrial: Trial = {
	iosSubscriptionGroup: '21445388',
	androidOfferTag: 'initial_supporter_launch_offer',
};

export const feastRegularSubscription: Trial = {
	iosSubscriptionGroup: '21396030',
	androidOfferTag: 'initial_supporter_launch_offer',
};
