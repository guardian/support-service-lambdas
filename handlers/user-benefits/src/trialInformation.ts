// This information is used by the apps to work out what offer to show to the user
export type TrialInformation = {
	iosSubscriptionGroup: string;
	androidOfferTag: string;
};

export const feastExtendedTrial: TrialInformation = {
	iosSubscriptionGroup: '21445388',
	androidOfferTag: 'initial_supporter_launch_offer',
};

export const feastRegularTrial: TrialInformation = {
	iosSubscriptionGroup: '21396030',
	androidOfferTag: 'initial_supporter_launch_offer',
};
