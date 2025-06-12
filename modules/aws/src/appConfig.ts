import type { z } from 'zod';
import { GetParametersByPathCommand, SSMClient } from '@aws-sdk/client-ssm';
import { awsConfig } from '../src/config';
import { groupMap, mapValues, partition } from '../../arrayFunctions';

/**
 * App config uses the guardian-standard SSM keys to load config.  The GU CDK lambda
 * provides permissions by default, meaning that you get the policies for free.
 *
 * @param stage
 * @param stack
 * @param app
 * @param schema this schema will validate that all your config is present
 */
export const loadConfig = async <O>(
	stage: string,
	stack: string,
	app: string,
	schema: z.ZodType<O, z.ZodTypeDef, any>,
): Promise<O> => {
	const configRoot = '/' + [stage, stack, app].join('/');
	console.log('getting app config from SSM', configRoot);
	const configFlat: SSMKeyValuePairs = await readAllRecursive(configRoot);
	return parseSSMConfigToObject(configFlat, configRoot, schema);
};

export type SSMKeyValuePairs = Record<string, string>[];

async function readAllRecursive(configRoot: string): Promise<SSMKeyValuePairs> {
	const ssm = new SSMClient(awsConfig);
	const command = new GetParametersByPathCommand({
		Path: configRoot,
		Recursive: true,
		WithDecryption: true,
	});
	const result = await ssm.send(command);

	if (!result.Parameters) {
		throw new Error(
			`Failed to retrieve config from parameter store: ${configRoot}, ${JSON.stringify(result)}`,
		);
	}

	return result.Parameters.flatMap((param) =>
		param.Value !== undefined && param.Name !== undefined
			? [{ [param.Name]: param.Value }]
			: [],
	);
}

// exported for test access
// converts a flat key/value structure into a proper type
export function parseSSMConfigToObject<
	I,
	O,
	T extends z.ZodType<O, z.ZodTypeDef, I>,
>(ssmKeyValuePairs: SSMKeyValuePairs, configRoot: string, schema: T): O {
	const configValuesByPath = ssmKeyValuePairs
		.flatMap(Object.entries)
		.map<PathArrayWithValue>(([name, value]) => ({
			path: name
				.replace(configRoot, '')
				.replace(/^\//, '')
				.split('/')
				.filter((k) => k.length > 0),
			value,
		}));
	const configTree = getTreeFromPaths(configValuesByPath);
	const parseResult = schema.safeParse(configTree);
	if (!parseResult.success) {
		throw new Error(
			'could not parse config:\n' +
				JSON.stringify(configTree, null, 2) +
				'\nDue to error: ' +
				parseResult.error,
		); // ZodError instance
	} else {
		return parseResult.data;
	}
}

type ConfigTree = string | { [p in string]: ConfigTree };

export type PathArrayWithValue = {
	path: string[];
	value: string;
};

// exported for tests
export const getTreeFromPaths = (paths: PathArrayWithValue[]): ConfigTree => {
	const pathArrayToPathTree: ({
		path,
		value,
	}: {
		path: string[];
		value: string;
	}) => ConfigTree = ({ path, value }) =>
		path.reduceRight<ConfigTree>(
			(inside, nextLeaf) => ({ [nextLeaf]: inside }),
			value,
		);

	const singleItemConfigTrees = paths.map(pathArrayToPathTree);
	return merge(singleItemConfigTrees);
};

export const configNestingError = 'ConfigNestingError';
export class ConfigNestingError extends Error {
	constructor(message: string) {
		super('config has a string value with objects below it: ' + message);
		this.name = configNestingError;
	}
}

function merge(singleItemTreesOrStringItem: ConfigTree[]): ConfigTree {
	const [stringValues, singleItemTrees] = partition(
		singleItemTreesOrStringItem,
		(configTree) => typeof configTree === 'string',
	);
	if (stringValues[0]) {
		// base case - we have reached a string value
		if (singleItemTrees.length > 0) {
			/*
			this would be valid in SSM but not in a schema - throw an error
			/qwer = "string_value"
			/qwer/rty = "nested_value"
			 */
			throw new ConfigNestingError(JSON.stringify(singleItemTrees));
		}
		return stringValues[0];
	}
	const subValuesPerKey = groupMap(
		singleItemTrees.flatMap(Object.entries),
		(tree) => tree[0],
		(tree) => tree[1],
	);
	return mapValues(subValuesPerKey, merge);
}
