import type { Stage } from '../../../modules/stage';
import { stageFromEnvironment } from '../../../modules/stage';
import { digitalSubSaveRequestSchema } from './requestSchema';
import { checkDefined } from './zuora/common';
import { getSubscription } from './zuora/getSubscription';
import { createZuoraClient } from './zuora/zuoraClient';
import type { RatePlan, ZuoraSubscription } from './zuora/zuoraSchemas';

export const applyDigiSubDiscount = async (body: string) => {
	const stage = stageFromEnvironment();

	const requestBody = digitalSubSaveRequestSchema.parse(JSON.parse(body));
	const zuoraClient = await createZuoraClient(stage);

	console.log('Getting the subscription details from Zuora');
	const subscription = await getSubscription(
		stage,
		zuoraClient,
		requestBody.subscriptionNumber,
	);
	console.log('Subscription details: ', JSON.stringify(subscription));

	const digitalSubRatePlan: RatePlan = checkDefined(
		findDigisubProductRatePlan(stage, subscription),
		'No digital subscription rate plan found',
	);
	console.log('Rate plan details: ', JSON.stringify(digitalSubRatePlan));
};

export const findDigisubProductRatePlan = (
	stage: Stage,
	subscription: ZuoraSubscription,
) => {
	const idsForStage = Object.values(digiSubProductRatePlanIds[stage]);
	return subscription.ratePlans.find((ratePlan: RatePlan) =>
		idsForStage.includes(ratePlan.productRatePlanId),
	);
};

export const digiSubProductRatePlanIds: {
	[K in Stage]: { monthly: string; annual: string; quarterly: string };
} = {
	CODE: {
		monthly: '2c92c0f84bbfec8b014bc655f4852d9d',
		quarterly: '2c92c0f84bbfec58014bc6a2d43a1f5b',
		annual: '2c92c0f94bbffaaa014bc6a4212e205b',
	},
	PROD: {
		monthly: '2c92a0fb4edd70c8014edeaa4eae220a',
		quarterly: '2c92a0fb4edd70c8014edeaa4e8521fe',
		annual: '2c92a0fb4edd70c8014edeaa4e972204',
	},
};
