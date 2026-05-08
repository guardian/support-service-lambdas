import type { GuardianSubscription } from '@modules/guardian-subscription/getSinglePlanFlattenedSubscriptionOrThrow';
import { isNewspaperProduct } from '@modules/product-catalog/productCatalog';
import type { ZuoraAccount } from '@modules/zuora/types';

const observerRatePlanKeys = [
	'Everyday',
	'EverydayPlus',
	'Weekend',
	'WeekendPlus',
	'Sunday',
	'SundayPlus',
];

export function isValid(
	guardianSubscription: GuardianSubscription,
	account: ZuoraAccount,
	postCode: string,
): boolean {
	const matchPostCode =
		account.billToContact.zipCode?.toLowerCase().replaceAll(' ', '') ===
		postCode.toLowerCase().replaceAll(' ', '');
	const isObserver =
		isNewspaperProduct(guardianSubscription.ratePlan.productKey) &&
		observerRatePlanKeys.includes(
			guardianSubscription.ratePlan.productRatePlanKey,
		);
	return matchPostCode && isObserver;
}
