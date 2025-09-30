import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import type { App } from 'aws-cdk-lib';

type SrStackNames = 'support' | 'membership';

export interface SrStackProps extends Omit<GuStackProps, 'stack'> {
	stack: SrStackNames;
}

export class SrStack extends GuStack {
	readonly stack: SrStackNames;
	constructor(scope: App, id: string, props: SrStackProps) {
		super(scope, id, props);
	}
}
