import type { Lazy } from '@modules/lazy';
import type { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import type { SimpleInvoiceItem } from '@modules/zuora/billingPreview';
import type { ZuoraAccount } from '@modules/zuora/types';
import type { GuardianSubscriptionWithKeys } from '../../guardianSubscription/getSinglePlanFlattenedSubscriptionOrThrow';
import type { ProductSwitchTargetBody } from '../schemas';
import type {
	AccountInformation} from './accountInformation';
import {
	getAccountInformation,
} from './accountInformation';
import { isGenerallyEligibleForDiscount } from './isGenerallyEligibleForDiscount';
import type {
	SubscriptionInformation} from './subscriptionInformation';
import {
	getSubscriptionInformation
} from './subscriptionInformation';
import type {
	SwitchMode,
	TargetInformation} from './targetInformation';
import {
	getTargetInformation
} from './targetInformation';

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
