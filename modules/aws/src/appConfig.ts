import { z } from 'zod';
import { GetParametersByPathCommand, SSMClient } from '@aws-sdk/client-ssm';
import { awsConfig } from '../src/config';
import { groupMap, mapValues, partition } from '../../arrayFunctions';
import { fetchAllPages } from './fetchAllPages';
import { logger } from '@modules/routing/logger';

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
	logger.log('getting app config from SSM', configRoot);
	return await loadCustomConfig(configRoot, schema);
};

export const accountIdsSchema = z.object({
	baton: z.string(),
	mobile: z.string(),
	targeting: z.string(),
});
export type AccountIds = z.infer<typeof accountIdsSchema>;

// need permissions to get this
export const loadAccountIds = async (): Promise<AccountIds> => {
	const configRoot = '/accountIds';
	logger.log('getting account ids from SSM', configRoot);
	return await loadCustomConfig(configRoot, accountIdsSchema);
};
async function loadCustomConfig<O>(
	configRoot: string,
	schema: z.ZodType<O, z.ZodTypeDef, any>,
) {
	const configFlat: SSMKeyValuePairs = await readAllRecursive(configRoot);
	return parseSSMConfigToObject(configFlat, configRoot, schema);
}

export type SSMKeyValuePairs = Record<string, string>[];

async function readAllRecursive(configRoot: string): Promise<SSMKeyValuePairs> {
	const ssm = new SSMClient(awsConfig);
	return fetchAllPages<Record<string, string>>(async (token) => {
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
	});
}

// exported for test access
// converts a flat key/value structure into a proper type
export function parseSSMConfigToObject<O>(
	ssmKeyValuePairs: SSMKeyValuePairs,
	configRoot: string,
	schema: z.ZodType<O, z.ZodTypeDef, any>,
): O {
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
		const configAsString = JSON.stringify(configTree, null, 2);
		throw new Error(
			`could not parse config:\n${configAsString}\nDue to error: ${parseResult.error}`,
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
	const [stringValues, singleItemTrees] = partition(
		singleItemTreesOrStringItem,
		(configTree) => typeof configTree === 'string',
	);
	const thisNode = stringValues[0];
	const subTree = mapValues(
		groupMap(
			singleItemTrees.flatMap(Object.entries),
			(tree) => tree[0],
			(tree) => tree[1],
		),
		merge,
	);
	const hasTree = singleItemTrees.length > 0;
	const hasStringValue = thisNode !== undefined;
	if (hasTree && hasStringValue) return { ...subTree, thisNode };
	else if (hasTree) return subTree;
	else if (hasStringValue) return thisNode;
	else throw new Error('no config: merge called with empty list');
}
