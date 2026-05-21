import type { GenerationOptions } from '../../../new-api-lambda';

function toPascalCase(name: string): string {
	return name
		.split('-')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join('');
}

export default ({ lambdaName, includeApiKey }: GenerationOptions): string => {
	const className = toPascalCase(lambdaName);
	const isPublicLine = !includeApiKey
		? `\n			isPublic: true, // Don't create an API Key for this lambda`
		: '';
	return `import type { App } from 'aws-cdk-lib';
import { SrApiLambda } from './cdk/SrApiLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class ${className} extends SrStack {
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
			},${isPublicLine}
		});
	}
}
`;
};
