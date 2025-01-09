import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import type { App } from 'aws-cdk-lib';
import {
	DefinitionBody,
	Pass,
	StateMachine,
} from 'aws-cdk-lib/aws-stepfunctions';

export class DiscountExpiryNotifier extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const appName = 'discount-expiry-notifier';

		const passState = new Pass(this, 'generic pass state');
		const definitionBody = DefinitionBody.fromChainable(passState);

		new StateMachine(this, `${appName}-state-machine-${this.stage}`,{
			definitionBody: definitionBody,
		});
	}
}
