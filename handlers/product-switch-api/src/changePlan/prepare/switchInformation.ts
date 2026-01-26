import { ZuoraAccount } from '@modules/zuora/types';
import { GuardianSubscriptionWithKeys } from '../../guardianSubscription/getSinglePlanFlattenedSubscriptionOrThrow';
import { ProductSwitchTargetBody } from '../schemas';
import { Lazy } from '@modules/lazy';
import { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import {
	AccountInformation,
	getAccountInformation,
} from './accountInformation';
import {
	getSubscriptionInformation,
	SubscriptionInformation,
} from './subscriptionInformation';
import { isGenerallyEligibleForDiscount } from './isGenerallyEligibleForDiscount';
import {
	getTargetInformation,
	SwitchMode,
	TargetInformation,
} from './targetInformation';
import { SimpleInvoiceItem } from '@modules/zuora/billingPreview';

export type SwitchInformation = {
	account: AccountInformation;
	subscription: SubscriptionInformation;
	target: TargetInformation;
};

export async function getSwitchInformation(
	productCatalogHelper: ProductCatalogHelper,
	input: ProductSwitchTargetBody,
	mode: SwitchMode,
	account: ZuoraAccount,
	guardianSubscriptionWithKeys: GuardianSubscriptionWithKeys,
	lazyBillingPreview: Lazy<SimpleInvoiceItem[]>,
): Promise<SwitchInformation> {
	const accountInformation = getAccountInformation(account);

	const subscriptionInformation: SubscriptionInformation =
		getSubscriptionInformation(guardianSubscriptionWithKeys);

	const generallyEligibleForDiscount = isGenerallyEligibleForDiscount(
		guardianSubscriptionWithKeys.subscription.status,
		mode,
		account.metrics.totalInvoiceBalance,
		lazyBillingPreview,
	);

	const targetInformation = await getTargetInformation(
		mode,
		input,
		guardianSubscriptionWithKeys.productCatalogKeys,
		generallyEligibleForDiscount,
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
