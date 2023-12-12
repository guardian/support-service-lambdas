import dayjs from 'dayjs';
import type { Stage } from '../../../modules/stage';
import { sum } from './arrayFunctions';
import { getZuoraCatalog } from './catalog/catalog';
import { EligibilityChecker } from './eligibilityChecker';
import type { ApplyDiscountRequestBody } from './requestSchema';
import { previewDiscount } from './zuora/addDiscount';
import type { ZuoraClient } from './zuora/zuoraClient';
import { createZuoraClient } from './zuora/zuoraClient';

export class PreviewDiscount {
	static async create(stage: Stage) {
		const catalog = await getZuoraCatalog(stage);
		const zuoraClient = await createZuoraClient(stage);
		const eligibilityChecker = new EligibilityChecker(
			stage,
			catalog,
			zuoraClient,
		);

		return new PreviewDiscount(eligibilityChecker, zuoraClient);
	}
	constructor(
		private eligibilityChecker: EligibilityChecker,
		private zuoraClient: ZuoraClient,
	) {}

	public async getDiscountPricePreview(requestBody: ApplyDiscountRequestBody) {
		const nextBillingDate =
			await this.eligibilityChecker.getNextBillingDateIfEligible(
				requestBody.subscriptionNumber,
				requestBody.discountProductRatePlanId,
			);

		console.log('Preview the new price once the discount has been applied');
		const previewResponse = await previewDiscount(
			this.zuoraClient,
			requestBody.subscriptionNumber,
			dayjs(nextBillingDate),
			requestBody.discountProductRatePlanId,
		);

		if (!previewResponse.success || previewResponse.invoiceItems.length != 2) {
			throw new Error(
				'Unexpected data in preview response from Zuora. ' +
					'We expected 2 invoice items, one for the discount and one for the main plan',
			);
		}

		return sum(
			previewResponse.invoiceItems,
			(item) => item.chargeAmount + item.taxAmount,
		);
	}
}
