import type { App } from 'aws-cdk-lib';
import { SrApiLambda } from './cdk/SrApiLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class ImovoVoucherApi extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'imovo-voucher-api' });

		new SrApiLambda(this, 'Lambda', {
			lambdaOverrides: {
				description: 'A lambda that handles Imovo reward voucher operations',
			},
			monitoring: {
				errorImpact: 'users may not receive their Imovo reward vouchers',
			},
		});
	}
}
