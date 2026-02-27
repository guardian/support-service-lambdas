import { GetParametersByPathCommand, SSMClient } from '@aws-sdk/client-ssm';
import { objectEntries } from '@modules/objectFunctions';
import { logger } from '@modules/routing/logger';
import type { z } from 'zod';
import { groupMap, mapValues, partitionByType } from '../../arrayFunctions';
import { awsConfig } from '../src/config';
import { fetchAllPages } from './fetchAllPages';

/**
 * App config uses the guardian-standard SSM keys to load config.  The GU CDK lambda
 * provides permissions by default, meaning that you get the policies for free.
 *
 * @param stage
 * @param stack
 * @param app
 * @param schema this schema will validate that all your config is present
 */
export const loadConfig = async <O, I>(
	stage: string,
	stack: string,
	app: string,
	schema: z.ZodType<O, z.ZodTypeDef, I>,
): Promise<O> => {
	const configRoot = '/' + [stage, stack, app].join('/');
	console.log('getting app config from SSM', configRoot);
	const configFlat: SSMKeyValuePairs = await readAllRecursive(configRoot);
	return parseSSMConfigToObject(configFlat, configRoot, schema);
};

export type SSMKeyValuePairs = Array<Record<string, string>>;

async function readAllRecursive(configRoot: string): Promise<SSMKeyValuePairs> {
	const ssm = logger.wrapAwsClient(new SSMClient(awsConfig));
	return fetchAllPages<Record<string, string>>(
		'GetParametersByPathCommand',
		async (token) => {
			const command = new GetParametersByPathCommand({
				Path: configRoot,
				Recursive: true,
				WithDecryption: true,
				NextToken: token,
			});
			const result = await ssm.send(command);

			if (!result.Parameters) {
				throw new Error(
					`Failed to retrieve config from parameter store: ${configRoot}, ${JSON.stringify(result)}`,
				);
			}

			return {
				nextToken: result.NextToken,
				thisPage: result.Parameters.flatMap((param) =>
					param.Value !== undefined && param.Name !== undefined
						? [{ [param.Name]: param.Value }]
						: [],
				),
			};
		},
	);
}

// exported for test access
// converts a flat key/value structure into a proper type
export function parseSSMConfigToObject<O, I>(
	ssmKeyValuePairs: SSMKeyValuePairs,
	configRoot: string,
	schema: z.ZodType<O, z.ZodTypeDef, I>,
): O {
	const configValuesByPath = ssmKeyValuePairs
		.flatMap(objectEntries)
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
		const configAsString = JSON.stringify(configTree, null, 2);
		throw new Error(
			`could not parse config:\n${configAsString}\nDue to error`,
			{ cause: parseResult.error },
		);
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

function merge(singleItemTreesOrStringItem: ConfigTree[]): ConfigTree {
	const [stringValues, singleItemTrees] = partitionByType(
		singleItemTreesOrStringItem,
		(configTree) => typeof configTree === 'string',
	);
	const thisNode = stringValues[0];
	const subTree = mapValues(
		groupMap(
			singleItemTrees.flatMap(objectEntries),
			(tree) => tree[0],
			(tree) => tree[1],
		),
		merge,
	);
	const hasTree = singleItemTrees.length > 0;
	const hasStringValue = thisNode !== undefined;
	if (hasTree && hasStringValue) {
		return { ...subTree, thisNode };
	} else if (hasTree) {
		return subTree;
	} else if (hasStringValue) {
		return thisNode;
	} else {
		throw new Error('no config: merge called with empty list');
	}
}
