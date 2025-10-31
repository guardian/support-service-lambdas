import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import type { App } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { SrApiLambda } from './cdk/SrApiLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export interface AddressLookupProps extends GuStackProps {
	stack: string;
	stage: string;
	certificateId: string;
	domainName: string;
	hostedZoneId: string;
}

export class AddressLookup extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'address-lookup' });

		// ---- API-triggered lambda functions ---- //
		const lambda = new SrApiLambda(this, `Lambda`, {
			lambdaOverrides: {
				description:
					'A lambda for doing address lookups via the AWS geo places API',
			},
			monitoring: {
				errorImpact:
					'address lookups may be failing for users on support.theguardian.com',
			},
		});

		lambda.addToRolePolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: ['geo-places:Autocomplete'],
				resources: ['*'],
			}),
		);
	}
}
