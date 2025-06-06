import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import type { App } from 'aws-cdk-lib';

export class MParticleApi extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		// const app = 'mparticle-api';
		// const nameWithStage = `${app}-${this.stage}`;
		// const commonEnvironmentVariables = {
		//     App: app,
		//     Stack: this.stack,
		//     Stage: this.stage,
		// };

		// new GuApiLambda(stack, "my-lambda", {
		// 	fileName: "my-app.zip",
		// 	handler: "handler.ts",
		// 	runtime: Runtime.NODEJS_14_X,
		// 	monitoringConfiguration: {
		// 		http5xxAlarm: { tolerated5xxPercentage: 5 },
		// 		snsTopicName: "alerts-topic",
		// 	},
		// 	app: "my-app",
		// 	api: {
		// 		id: "my-api",
		// 		description: "...",
		// 	},
		// });
	}
}
