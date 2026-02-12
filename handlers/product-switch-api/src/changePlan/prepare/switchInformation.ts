import type { GuardianSubscription } from '@modules/guardian-subscription/getSinglePlanFlattenedSubscriptionOrThrow';
import { userHasGuardianEmail } from '@modules/product-benefits/userBenefits';
import type { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import type { ZuoraAccount } from '@modules/zuora/types';
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
	subscription: GuardianSubscription,
): Promise<SwitchInformation> {
	const accountInformation = getAccountInformation(account);

	const subscriptionInformation: SubscriptionInformation =
		getSubscriptionInformation(subscription);

	const targetInformation = await getTargetInformation(
		input,
		subscription.ratePlan,
		accountInformation.currency,
		subscriptionInformation.previousAmount,
		subscriptionInformation.includesContribution,
		userHasGuardianEmail(account.billToContact.workEmail) ||
			account.billToContact.workEmail.endsWith('@thegulocal.com'),
		productCatalogHelper,
	);

	return {
		account: accountInformation,
		subscription: subscriptionInformation,
		target: targetInformation,
	};
}
