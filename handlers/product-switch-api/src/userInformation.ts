import { ValidationError } from '@modules/errors';
import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import type { Stage } from '@modules/stage';
import { getAccount } from '@modules/zuora/getAccount';
import { getSubscription } from '@modules/zuora/getSubscription';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { BillingInformation } from './billingInformation';
import { getBillingInformation } from './billingInformation';

export type ProductSwitchUserInformation = {
	identityId: string;
	emailAddress: string;
	firstName: string;
	lastName: string;
};

export type SubscriptionInformation = {
	accountNumber: string;
	subscriptionNumber: string;
};

export type ProductSwitchInformation = {
	stage: Stage;
	preview: boolean;
	userInformation: ProductSwitchUserInformation;
	subscriptionInformation: SubscriptionInformation;
	billingInformation: BillingInformation;
};

export const getUserInformation = async (
	zuoraClient: ZuoraClient,
	accountNumber: string,
): Promise<ProductSwitchUserInformation> => {
	const account = await getAccount(zuoraClient, accountNumber);
	return {
		identityId: account.basicInfo.identityId,
		emailAddress: account.billToContact.workEmail,
		firstName: account.billToContact.firstName,
		lastName: account.billToContact.lastName,
	};
};

// Gets a subscription from Zuora and checks that it is owned by currently logged in user
export const getSwitchInformationWithOwnerCheck = async (
	stage: Stage,
	preview: boolean,
	zuoraClient: ZuoraClient,
	productCatalog: ProductCatalog,
	identityId: string,
	subscriptionNumber: string,
	billingAmount: number,
): Promise<ProductSwitchInformation> => {
	console.log(
		`Checking subscription ${subscriptionNumber} is owned by the currently logged in user`,
	);
	const subscription = await getSubscription(zuoraClient, subscriptionNumber);
	const userInformation = await getUserInformation(
		zuoraClient,
		subscription.accountNumber,
	);
	if (userInformation.identityId !== identityId) {
		throw new ValidationError(
			`Subscription ${subscription.subscriptionNumber} does not belong to identity ID ${identityId}`,
		);
	}
	console.log(
		`Subscription ${subscriptionNumber} is owned by identity user ${identityId}`,
	);

	const billingInformation = getBillingInformation(
		productCatalog,
		subscription,
		billingAmount,
	);

	const subscriptionInformation = {
		accountNumber: subscription.accountNumber,
		subscriptionNumber: subscription.subscriptionNumber,
	};

	return {
		stage,
		preview,
		userInformation,
		subscriptionInformation,
		billingInformation,
	};
};
