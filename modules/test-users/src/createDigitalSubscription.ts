import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import { createAccountAndSubscription } from '@modules/test-users/src/create';

void (async () => {
	const stage = 'CODE';
	const zuoraClient = await ZuoraClient.create(stage);
	const productCatalog = await getProductCatalogFromApi(stage);
	const productRatePlanId =
		productCatalog.DigitalSubscription.ratePlans.Monthly.id;
	const today = dayjs();
	const subscriptionDetails = {
		contractEffectiveDate: today,
		customerAcceptanceDate: today,
		firstName: 'test',
		lastName: 'user',
		email: 'test.user@thegulocal.com',
		subscribeItems: [
			{
				productRatePlanId,
			},
		],
	};
	const response = await createAccountAndSubscription(
		zuoraClient,
		subscriptionDetails,
	);
	console.log(response);
})();
