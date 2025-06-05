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
	}
}
