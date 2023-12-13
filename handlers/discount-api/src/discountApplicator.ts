import dayjs from 'dayjs';
import type { Stage } from '../../../modules/stage';
import { getZuoraCatalog } from './catalog/catalog';
import { EligibilityChecker } from './eligibilityChecker';
import type { ApplyDiscountRequestBody } from './requestSchema';
import { addDiscount } from './zuora/addDiscount';
import type { ZuoraClient } from './zuora/zuoraClient';
import { createZuoraClient } from './zuora/zuoraClient';

export class DiscountApplicator {
	static async create(stage: Stage) {
		const catalog = await getZuoraCatalog(stage);
		const zuoraClient = await createZuoraClient(stage);
		const eligibilityChecker = new EligibilityChecker(
			stage,
			catalog,
			zuoraClient,
		);

		return new DiscountApplicator(eligibilityChecker, zuoraClient);
	}
	constructor(
		private eligibilityChecker: EligibilityChecker,
		private zuoraClient: ZuoraClient,
	) {}

	public async applyDiscount(requestBody: ApplyDiscountRequestBody) {
		const nextBillingDate =
			await this.eligibilityChecker.getNextBillingDateIfEligible(
				requestBody.subscriptionNumber,
				requestBody.discountProductRatePlanId,
			);

		console.log('Apply a discount to the subscription');
		const discounted = await addDiscount(
			this.zuoraClient,
			requestBody.subscriptionNumber,
			dayjs(nextBillingDate),
			requestBody.discountProductRatePlanId,
		);

		if (discounted.success) {
			console.log('Discount applied successfully');
		}
	}
}
