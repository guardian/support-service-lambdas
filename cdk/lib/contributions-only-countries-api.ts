import type { App } from 'aws-cdk-lib';
import { SrApiLambda } from './cdk/SrApiLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class ContributionsOnlyCountriesApi extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'contributions-only-countries-api' });

		new SrApiLambda(this, 'Lambda', {
			lambdaOverrides: {
				description:
					'A lambda that returns a list of countries that are contributions-only',
			},
			monitoring: {
				errorImpact:
					'users from contributions-only countries will see the choice cards in epics/banners and support site',
			},

			isPublic: true, // Don't create an API Key for this lambda
		});
	}
}
