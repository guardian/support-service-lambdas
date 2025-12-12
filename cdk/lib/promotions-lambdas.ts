import type { App } from 'aws-cdk-lib';
import { SrApiLambda } from './cdk/SrApiLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';
import {SrLambda} from "./cdk/SrLambda";

export class PromotionsLambdas extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'promotions-lambdas' });

		new SrLambda(this, 'PromoCampaignSync', {

		});
	}
}
