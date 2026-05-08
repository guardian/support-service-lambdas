import type { GuardianSubscription } from '@modules/guardian-subscription/getSinglePlanFlattenedSubscriptionOrThrow';
import { getSinglePlanFlattenedSubscriptionOrThrow } from '@modules/guardian-subscription/getSinglePlanFlattenedSubscriptionOrThrow';
import { GuardianSubscriptionParser } from '@modules/guardian-subscription/guardianSubscriptionParser';
import { SubscriptionFilter } from '@modules/guardian-subscription/subscriptionFilter';
import { type ProductCatalog } from '@modules/product-catalog/productCatalog';
import { logger } from '@modules/routing/logger';
import { getAccount } from '@modules/zuora/account';
import { ZuoraError } from '@modules/zuora/errors/zuoraError';
import { getSubscription } from '@modules/zuora/subscription';
import { zuoraDateFormat } from '@modules/zuora/utils/common';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { ZuoraCatalog } from '@modules/zuora-catalog/zuoraCatalogSchema';
import type { APIGatewayProxyResult } from 'aws-lambda';
import dayjs from 'dayjs';
import type { RequestBody } from './schemas';
import { isValid } from './validation';

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
			return buildReponseBody(
				true,
				zuoraDateFormat(dayjs(zuoraSubscription.termEndDate)),
			);
		}
		return buildReponseBody(false);
	} catch (error) {
		logger.error('Error fetching subscription or account', error);
		if (error instanceof ZuoraError && error.code === 200) {
			return buildReponseBody(false);
		}
		throw error;
	}
}

function buildReponseBody(isActive: boolean, renews?: string) {
	return {
		statusCode: 200,
		body: JSON.stringify({ isActive, renews }),
	};
}
