export interface HandlerConfig {
	name: string;
	functionNames: string[];
}

export interface GeneratorConfig {
	packages: HandlerConfig[];
}

export const generatorConfig: GeneratorConfig = {
	packages: [
		{
			name: 'alarms-handler',
			functionNames: ['alarms-handler-', 'alarms-handler-scheduled-'],
		},
	],
};
