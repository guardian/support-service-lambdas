import { getIfDefined } from '@modules/nullAndUndefined';
import { prettyPrint } from '@modules/prettyPrint';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import { zuoraDateFormat } from '@modules/zuora/common';
import { getSubscription } from '@modules/zuora/getSubscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { ZuoraSubscription } from '@modules/zuora/zuoraSchemas';
import { zuoraSuccessResponseSchema } from '@modules/zuora/zuoraSchemas';
import dayjs from 'dayjs';

const getFirstContributionRatePlan = (
	productCatalog: ProductCatalog,
	subscription: ZuoraSubscription,
) => {
	const contributionProductRatePlanIds = [
		productCatalog.Contribution.ratePlans.Annual.id,
		productCatalog.Contribution.ratePlans.Monthly.id,
	];
	return getIfDefined(
		subscription.ratePlans.find(
			(ratePlan) =>
				ratePlan.lastChangeType !== 'Remove' &&
				contributionProductRatePlanIds.includes(ratePlan.productRatePlanId),
		),
		`No contribution rate plan found in the subscription ${prettyPrint(
			subscription,
		)}`,
	);
};
void (async () => {
	const subscriptionNumber = process.argv[2];
	const newAmount = process.argv[3];
	if (
		!subscriptionNumber?.startsWith('A-S') ||
		subscriptionNumber.length != 11
	) {
		console.log(
			'Please provide a valid Zuora subscription number. eg. updateMonthlyContributionAmount A-S1234567890 9.75',
		);
		return;
	}
	if (!newAmount) {
		console.log(
			'Please provide a valid new amount. eg. updateMonthlyContributionAmount A-S1234567890 9.75',
		);
		return;
	}
	const zuoraClient = await ZuoraClient.create('CODE');
	const subscription = await getSubscription(zuoraClient, subscriptionNumber);
	if (subscription.status !== 'Active') {
		throw new Error(
			`Subscription ${subscriptionNumber} is not active. Cannot update contribution amount.`,
		);
	}

	const productCatalog = await getProductCatalogFromApi('CODE');
	const contributionRatePlan = getFirstContributionRatePlan(
		productCatalog,
		subscription,
	);

	const today = zuoraDateFormat(dayjs());
	const path = `/v1/subscriptions/${subscriptionNumber}`;
	const body = JSON.stringify({
		update: [
			{
				chargeUpdateDetails: [
					{
						price: newAmount,
						ratePlanChargeId: contributionRatePlan.ratePlanCharges[0]?.id,
					},
				],
				ratePlanId: contributionRatePlan.id,
				contractEffectiveDate: today,
				customerAcceptanceDate: today,
				serviceActivationDate: today,
			},
		],
		collect: true,
		runBilling: true,
		notes: 'Updated amount from support-service-lambdas test-users project',
	});
	return zuoraClient.put(path, body, zuoraSuccessResponseSchema, {
		'zuora-version': '211.0',
	});
})();
