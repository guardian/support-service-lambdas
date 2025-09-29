import { pnpmCatalog } from '../src/dynamic/dependencies';

/*
This is the main build definition for all handlers.

Each record defines one handler and contains anything unique compared with the
assumed build structure.
 */

export interface HandlerDefinition {
	name: string;
	functionNames?: string[];
	entryPoints?: string[];
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
}

const alarmsHandler: HandlerDefinition = {
	name: 'alarms-handler',
	functionNames: ['alarms-handler-', 'alarms-handler-scheduled-'],
	entryPoints: ['src/index.ts', 'src/indexScheduled.ts'],
	dependencies: {
		...pnpmCatalog['@aws-sdk/client-cloudwatch'],
		...pnpmCatalog['@aws-sdk/credential-providers'],
		...pnpmCatalog.zod,
	},
	devDependencies: {
		...pnpmCatalog['@types/aws-lambda'],
		...pnpmCatalog.dayjs,
	},
};

const discountApi: HandlerDefinition = {
	name: 'discount-api',
	dependencies: {
		...pnpmCatalog.dayjs,
		...pnpmCatalog['source-map-support'],
		...pnpmCatalog.zod,
	},
	devDependencies: {
		...pnpmCatalog['@types/aws-lambda'],
	},
};

export const build: HandlerDefinition[] = [alarmsHandler, discountApi];
