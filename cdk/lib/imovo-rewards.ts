
import type { App } from 'aws-cdk-lib';
import { SrApiLambda } from './cdk/SrApiLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class ImovoRewards extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'imovo-rewards' });

		new SrApiLambda(this, 'Lambda', {
        			lambdaOverrides: {
        				description:
        					'A lambda that enables the addition of discounts to existing subscriptions',
        			},
        			monitoring: {
        				errorImpact:
        					'an eligible user may not have been offered a discount during the cancellation flow',
        			},
        			
        		});
    }
}
