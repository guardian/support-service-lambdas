import type { App } from 'aws-cdk-lib';
import { SrLambda } from './cdk/SrLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class PromotionsLambdas extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'promotions-lambdas' });

		new SrLambda(this, 'PromoCampaignSync', {
			nameSuffix: 'promo-campaign-sync',
			lambdaOverrides: {
				handler: 'handlers/promoCampaignSync.handler',
			},
		});
	}
}
