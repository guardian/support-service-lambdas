import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import { createAccountAndSubscription } from '@modules/test-users/src/create';

void (async () => {
	const amount = process.argv[2];
	if (!amount) {
		console.log(
			'Please provide a valid contribution amount. eg. createAnnualContribution 45',
		);
		return;
	}

	const stage = 'CODE';
	const zuoraClient = await ZuoraClient.create(stage);
	const productCatalog = await getProductCatalogFromApi(stage);
	const productRatePlanId = productCatalog.Contribution.ratePlans.Annual.id;
	const productRatePlanChargeId =
		productCatalog.Contribution.ratePlans.Annual.charges.Contribution.id;
	const today = dayjs();

	const contributionAmount = parseFloat(amount);

	const subscriptionDetails = {
		contractEffectiveDate: today,
		customerAcceptanceDate: today,
		firstName: 'test',
		lastName: 'user',
		email: 'test.user@thegulocal.com',
		subscribeItems: [
			{
				productRatePlanId,
				chargeOverride: {
					productRatePlanChargeId,
					price: contributionAmount,
				},
			},
		],
	};
	const response = await createAccountAndSubscription(
		zuoraClient,
		subscriptionDetails,
	);
	console.log(response);
})();
