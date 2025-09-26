import { dep, catalog } from './dependencies';

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

export interface RootDefinition {
	catalog: Record<string, string>;
}

export interface WorkspaceDefinition {
	root: RootDefinition;
	handlers: HandlerDefinition[];
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

export const build: WorkspaceDefinition = {
	root: { catalog },
	handlers: [alarmsHandler, discountApi],
};
