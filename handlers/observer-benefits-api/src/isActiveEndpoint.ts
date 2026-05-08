import type { GuardianSubscription } from '@modules/guardian-subscription/getSinglePlanFlattenedSubscriptionOrThrow';
import { getSinglePlanFlattenedSubscriptionOrThrow } from '@modules/guardian-subscription/getSinglePlanFlattenedSubscriptionOrThrow';
import { GuardianSubscriptionParser } from '@modules/guardian-subscription/guardianSubscriptionParser';
import { SubscriptionFilter } from '@modules/guardian-subscription/subscriptionFilter';
import {
	isNewspaperProduct,
	type ProductCatalog,
} from '@modules/product-catalog/productCatalog';
import { logger } from '@modules/routing/logger';
import { getAccount } from '@modules/zuora/account';
import { getSubscription } from '@modules/zuora/subscription';
import type { ZuoraAccount } from '@modules/zuora/types';
import { zuoraDateFormat } from '@modules/zuora/utils/common';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { ZuoraCatalog } from '@modules/zuora-catalog/zuoraCatalogSchema';
import type { APIGatewayProxyResult } from 'aws-lambda';
import dayjs from 'dayjs';
import type { RequestBody } from './schemas';

const observerRatePlanKeys = [
	'Everyday',
	'EverydayPlus',
	'Weekend',
	'WeekendPlus',
	'Sunday',
	'SundayPlus',
];

export async function isActiveEndpoint(
	zuoraClient: ZuoraClient,
	productCatalog: ProductCatalog,
	zuoraCatalog: ZuoraCatalog,
	body: RequestBody,
): Promise<APIGatewayProxyResult> {
	try {
		logger.log('Checking if subscription is active', body.subscriptionId);
		const zuoraSubscription = await getSubscription(
			zuoraClient,
			body.subscriptionId,
		);
		const account = await getAccount(
			zuoraClient,
			zuoraSubscription.accountNumber,
		);
		const parser = new GuardianSubscriptionParser(zuoraCatalog, productCatalog);
		const guardianSubscription =
			parser.toGuardianSubscription(zuoraSubscription);
		const filter = SubscriptionFilter.activeNonEndedSubscriptionFilter(dayjs());
		const filteredSubscription =
			filter.filterSubscription(guardianSubscription);
		const subscription: GuardianSubscription =
			getSinglePlanFlattenedSubscriptionOrThrow(filteredSubscription);

		if (isValid(subscription, account, body.postCode)) {
			return Promise.resolve({
				statusCode: 200,
				body: JSON.stringify({
					isActive: true,
					renews: zuoraDateFormat(dayjs(zuoraSubscription.termEndDate)), // Convert IsoDateTimeString to IsoDate
				}),
			});
		}

		return Promise.resolve({
			statusCode: 200,
			body: JSON.stringify({ isActive: false }),
		});
	} catch (error) {
		logger.error('Error fetching subscription or account', error);
		return Promise.resolve({
			statusCode: 200,
			body: JSON.stringify({ isActive: false }),
		});
	}
}

function isValid(
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
