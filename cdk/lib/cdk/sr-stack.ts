import type {
	AppIdentity,
	GuStackProps,
} from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import type { App } from 'aws-cdk-lib';

export type SrStackNames = 'support' | 'membership';
export type SrStageNames = 'CODE' | 'PROD';
export const stages: SrStageNames[] = ['CODE', 'PROD'];

export interface SrStackProps extends Omit<GuStackProps, 'stack'> {
	stack: SrStackNames;
	app: string;
}

export class SrStack extends GuStack implements AppIdentity {
	readonly stack: SrStackNames;
	readonly app: string;
	constructor(scope: App, props: SrStackProps) {
		super(scope, `${props.app}-${props.stage}`, props);
		this.app = props.app;
	}
}
