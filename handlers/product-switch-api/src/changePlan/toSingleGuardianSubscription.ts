import type dayjs from 'dayjs';
import type { GuardianSubscription } from '@modules/guardian-subscription/getSinglePlanFlattenedSubscriptionOrThrow';
import { getSinglePlanFlattenedSubscriptionOrThrow } from '@modules/guardian-subscription/getSinglePlanFlattenedSubscriptionOrThrow';
import {
	type GuardianSubscriptionMultiPlan,
	GuardianSubscriptionParser,
} from '@modules/guardian-subscription/guardianSubscriptionParser';
import { SubscriptionFilter } from '@modules/guardian-subscription/subscriptionFilter';
import { logger } from '@modules/logger/logger';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import type { Stage } from '@modules/stage';
import type { ZuoraSubscription } from '@modules/zuora/types';
import { getZuoraCatalogFromS3 } from '@modules/zuora-catalog/S3';
import type { ZuoraCatalog } from '@modules/zuora-catalog/zuoraCatalogSchema';

export class ToSingleGuardianSubscription {
	constructor(
		private zuoraCatalog: ZuoraCatalog,
		public productCatalog: ProductCatalog,
	) {}

	static async build(stage: Stage): Promise<ToSingleGuardianSubscription> {
		logger.log('Loading the product catalog');
		const productCatalog: ProductCatalog =
			await getProductCatalogFromApi(stage);
		const zuoraCatalog: ZuoraCatalog = await getZuoraCatalogFromS3(stage);

		return new ToSingleGuardianSubscription(zuoraCatalog, productCatalog);
	}

	getSubscription(today: dayjs.Dayjs, zuoraSubscription: ZuoraSubscription) {
		const guardianSubscriptionParser = new GuardianSubscriptionParser(
			this.zuoraCatalog, // need zuora catalog to identify non product-catalog plans e.g. Discount
			this.productCatalog,
		);
		const activeCurrentSubscriptionFilter =
			SubscriptionFilter.activeNonEndedSubscriptionFilter(today);

		const guardianSubscriptionAllPlans: GuardianSubscriptionMultiPlan =
			guardianSubscriptionParser.toGuardianSubscription(zuoraSubscription);
		const guardianSubscriptionCurrentPlans: GuardianSubscriptionMultiPlan =
			activeCurrentSubscriptionFilter.filterSubscription(
				guardianSubscriptionAllPlans,
			);

		const subscription: GuardianSubscription =
			getSinglePlanFlattenedSubscriptionOrThrow(
				guardianSubscriptionCurrentPlans,
			);

		logger.log('guardian subscription', subscription);
		return subscription;
	}
}
