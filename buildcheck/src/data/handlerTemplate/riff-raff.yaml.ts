import { HandlerConfig } from '../build';

export default (pkg: HandlerConfig) => ({
	stacks: ['support'],
	regions: ['eu-west-1'],
	allowedStages: ['CODE', 'PROD'],
	deployments: {
		[`${pkg.name}-cloudformation`]: {
			type: 'cloud-formation',
			app: pkg.name,
			parameters: {
				templateStagePaths: {
					CODE: `${pkg.name}-CODE.template.json`,
					PROD: `${pkg.name}-PROD.template.json`,
				},
			},
		},
		[pkg.name]: {
			type: 'aws-lambda',
			parameters: {
				fileName: `${pkg.name}.zip`,
				bucketSsmLookup: true,
				prefixStack: false,
				functionNames: pkg.functionNames ?? [pkg.name + '-'],
			},
			dependencies: [`${pkg.name}-cloudformation`],
		},
	},
});
