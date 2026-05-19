import type { App } from 'aws-cdk-lib';
import { SrApiLambda } from './cdk/SrApiLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class VatCountriesListApi extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'vat-countries-list-api' });

		new SrApiLambda(this, 'Lambda', {
			lambdaOverrides: {
				description:
					'A lambda that returns a list of VAT compliant countries',
			},
			monitoring: {
				errorImpact:
					'users from VAT compliant countries will see the choice cards in epics/banners and https://support.theguardian.com/contribute screen',
			},

			isPublic: true, // Don't create an API Key for this lambda
		});
	}
}
