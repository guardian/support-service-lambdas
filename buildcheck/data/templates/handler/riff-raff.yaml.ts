import { HandlerDefinition } from '../../build';
import { recordFromEntries } from '../../../src/util/dependencyMapper';

const stage =
	(pkg: HandlerDefinition) =>
	(stage: string): [string, string] => [
		stage,
		`${pkg.name}-${stage}.template.json`,
	];

export default (pkg: HandlerDefinition) => {
	const allowedStages = ['CODE', 'PROD', ...(pkg.extraStages ?? [])].sort();
	return {
		stacks: [pkg.stack ?? 'support'],
		regions: ['eu-west-1'],
		allowedStages,
		deployments: {
			[`${pkg.name}-cloudformation`]: {
				type: 'cloud-formation',
				app: pkg.name,
				parameters: {
					templateStagePaths: recordFromEntries(allowedStages.map(stage(pkg))),
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
	};
};
