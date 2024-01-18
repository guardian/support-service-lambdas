import type { RatePlan } from '@modules/zuora/zuoraSchemas';

export const isDiscount = (ratePlan: RatePlan) => {
	return (
		ratePlan.productName === 'Discounts' ||
		ratePlan.productName === 'Promotions' // The CODE environment uses a different product for acquisition promotions
	);
};
export const isNotDiscount = (ratePlan: RatePlan) => !isDiscount(ratePlan);

export const isRemoved = (ratePlan: RatePlan) => {
	return ratePlan.lastChangeType === 'Remove';
};

export const isNotRemoved = (ratePlan: RatePlan) => !isRemoved(ratePlan);

export const isNotRemovedOrDiscount = (ratePlan: RatePlan) =>
	isNotDiscount(ratePlan) && isNotRemoved(ratePlan);
