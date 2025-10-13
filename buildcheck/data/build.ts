import { dep } from './dependencies';

/*
This is the main build definition for all handlers.

Each record defines one handler and contains anything unique compared with the
assumed build structure.
 */

export interface HandlerDefinition {
	name: string;
	functionNames?: string[];
	entryPoints?: string[];
	testTimeoutSeconds?: number;
	extraScripts?: Record<string, string>;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
}

const alarmsHandler: HandlerDefinition = {
	name: 'alarms-handler',
	functionNames: ['alarms-handler-', 'alarms-handler-scheduled-'],
	entryPoints: ['src/index.ts', 'src/indexScheduled.ts'],
	dependencies: {
		...dep['@aws-sdk/client-cloudwatch'],
		...dep['@aws-sdk/credential-providers'],
		...dep.zod,
	},
	devDependencies: {
		...dep['@types/aws-lambda'],
		...dep.dayjs,
	},
};

const discountApi: HandlerDefinition = {
	name: 'discount-api',
	dependencies: {
		...dep.dayjs,
		...dep['source-map-support'],
		...dep.zod,
	},
	devDependencies: {
		...dep['@types/aws-lambda'],
	},
};

const updateSupporterPlusAmount: HandlerDefinition = {
	name: 'update-supporter-plus-amount',
	dependencies: {
		...dep['@aws-sdk/client-sqs'],
		...dep.dayjs,
		...dep.zod,
	},
	devDependencies: {
		...dep['@types/aws-lambda'],
	},
};

const productSwitchApi: HandlerDefinition = {
	name: 'product-switch-api',
	testTimeoutSeconds: 15,
	dependencies: {
		...dep['@aws-sdk/client-sqs'],
		...dep.dayjs,
		...dep['source-map-support'],
		...dep.zod,
	},
	devDependencies: {
		...dep['@types/aws-lambda'],
	},
};

const mparticleApi: HandlerDefinition = {
	name: 'mparticle-api',
	functionNames: ['mparticle-api-http-', 'mparticle-api-baton-'],
	testTimeoutSeconds: 15,
	extraScripts: {
		'check-config': 'ts-node runManual/runLoadConfig.ts',
	},
	dependencies: {
		...dep['@peculiar/x509'],
		...dep.zod,
	},
	devDependencies: {
		...dep['@faker-js/faker'],
		...dep['@types/aws-lambda'],
		...dep['@aws-sdk/client-s3'],
	},
};

export const build: HandlerDefinition[] = [
	alarmsHandler,
	discountApi,
	updateSupporterPlusAmount,
	productSwitchApi,
	mparticleApi,
];
