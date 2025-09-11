import { dep } from './dependencies';

const alarmsHandler: HandlerConfig = {
	name: 'alarms-handler',
	functionNames: ['alarms-handler-', 'alarms-handler-scheduled-'],
	entryPoints: ['src/index.ts', 'src/indexScheduled.ts'],
	dependencies: {
		...dep.awsSdk('client-cloudwatch'),
		...dep.awsSdk('credential-providers'),
		...dep.zod,
	},
	devDependencies: {
		...dep.awsLambdaTypes,
		...dep.dayjs,
	},
};

const discountApi: HandlerConfig = {
	name: 'discount-api',
	dependencies: {
		...dep.dayjs,
		...dep.zod,
	},
	devDependencies: {
		...dep.awsLambdaTypes,
	},
};

export const generatorConfig: GeneratorConfig = {
	packages: [alarmsHandler, discountApi],
};

export interface HandlerConfig {
	name: string;
	functionNames?: string[];
	entryPoints?: string[];
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
}

export interface GeneratorConfig {
	packages: HandlerConfig[];
}
