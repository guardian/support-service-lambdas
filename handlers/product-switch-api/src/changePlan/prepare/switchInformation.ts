import type { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import type { ZuoraAccount } from '@modules/zuora/types';
import type { GuardianSubscriptionWithKeys } from '../../guardianSubscription/getSinglePlanFlattenedSubscriptionOrThrow';
import type { ProductSwitchTargetBody } from '../schemas';
import type { AccountInformation } from './accountInformation';
import { getAccountInformation } from './accountInformation';
import type { SubscriptionInformation } from './subscriptionInformation';
import { getSubscriptionInformation } from './subscriptionInformation';
import type { TargetInformation } from './targetInformation';
import { getTargetInformation } from './targetInformation';

export type SwitchInformation = {
	account: AccountInformation;
	subscription: SubscriptionInformation;
	target: TargetInformation;
};

export async function getSwitchInformation(
	productCatalogHelper: ProductCatalogHelper,
	input: ProductSwitchTargetBody,
	account: ZuoraAccount,
	guardianSubscriptionWithKeys: GuardianSubscriptionWithKeys,
): Promise<SwitchInformation> {
	const accountInformation = getAccountInformation(account);

	const subscriptionInformation: SubscriptionInformation =
		getSubscriptionInformation(guardianSubscriptionWithKeys);

	const targetInformation = await getTargetInformation(
		input,
		guardianSubscriptionWithKeys.productCatalogKeys,
		accountInformation.currency,
		subscriptionInformation.previousAmount,
		productCatalogHelper,
	);

	return {
		account: accountInformation,
		subscription: subscriptionInformation,
		target: targetInformation,
	};
}
