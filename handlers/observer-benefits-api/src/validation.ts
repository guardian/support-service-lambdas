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

function sanitizePostCode(postCode: string): string {
	return postCode.toLowerCase().replace(/\s+/g, '');
}

export function validateSubscription(
	guardianSubscription: GuardianSubscription,
	account: ZuoraAccount,
	postCode: string,
): boolean {
	const { zipCode } = account.billToContact;

	if (!zipCode) {
		return false;
	}

	const matchPostCode =
		sanitizePostCode(zipCode) === sanitizePostCode(postCode);
	const isObserver =
		isNewspaperProduct(guardianSubscription.ratePlan.productKey) &&
		observerRatePlanKeys.includes(
			guardianSubscription.ratePlan.productRatePlanKey,
		);
	return matchPostCode && isObserver;
}
