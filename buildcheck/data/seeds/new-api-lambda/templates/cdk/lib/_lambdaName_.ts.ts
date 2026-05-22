import type { TemplateContent } from '../../../../../../src/dynamic/templater';
import { toPascalCase } from '../../../../../snippets/string';
import type { GenerationOptions } from '../../../index';

export default ({
	lambdaName,
	includeApiKey,
}: GenerationOptions): TemplateContent => `import type { App } from 'aws-cdk-lib';
import { SrApiLambda } from './cdk/SrApiLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class ${toPascalCase(lambdaName)} extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: '${lambdaName}' });

		new SrApiLambda(this, 'Lambda', {
			lambdaOverrides: {
				description:
					'A lambda that enables the addition of discounts to existing subscriptions',
			},
			monitoring: {
				errorImpact:
					'an eligible user may not have been offered a discount during the cancellation flow',
			},
			throttle: {
				rateLimit: 20,
				burstLimit: 10,
			},${
				includeApiKey
					? ''
					: `\n			isPublic: true, // Don't create an API Key for this lambda`
			}
		});
	}
}
`;
