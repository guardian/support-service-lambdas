import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import {
	type GuFunctionProps,
	GuLambdaFunction,
} from '@guardian/cdk/lib/constructs/lambda';
import { type App, Duration } from 'aws-cdk-lib';
import { User } from 'aws-cdk-lib/aws-iam';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { nodeVersion } from './node-version';

export class ObserverDataExport extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const app = 'observer-data-export';

		const bucket = new Bucket(this, 'Bucket', {
			bucketName: `${app}-${this.stage.toLowerCase()}`,
			lifecycleRules: [{ expiration: Duration.days(28) }],
		});

		const unifidaUser = new User(this, 'UnifidaUser', {
			userName: `unifida-${this.stage.toLowerCase()}`,
		});

		bucket.grantRead(unifidaUser);

		const lambdaDefaultConfig: Pick<
			GuFunctionProps,
			'app' | 'memorySize' | 'fileName' | 'runtime' | 'timeout' | 'environment'
		> = {
			app,
			memorySize: 1024,
			fileName: `${app}.zip`,
			runtime: nodeVersion,
			timeout: Duration.seconds(300),
			environment: { Stage: this.stage },
		};

		new GuLambdaFunction(this, 'PlaceholderLambda', {
			...lambdaDefaultConfig,
			handler: 'placeholder.handler',
			functionName: `placeholder-${this.stage}`,
		});
	}
}
