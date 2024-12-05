import type {
	ProductBenefit,
	Trial,
	TrialInformation,
} from '@modules/product-benefits/schemas';

export const feastRegularSubscription: Trial = {
	iosSubscriptionGroup: '21396030',
	androidOfferTag: 'initial_supporter_launch_offer',
};

export const getTrialInformation = (
	productBenefits: ProductBenefit[],
): TrialInformation => {
	if (productBenefits.includes('feastApp')) {
		return {};
	}
	return {
		feastApp: feastRegularSubscription,
	};
};
