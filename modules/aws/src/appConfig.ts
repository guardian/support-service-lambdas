import type { z } from 'zod';
import { GetParametersByPathCommand, SSMClient } from '@aws-sdk/client-ssm';
import { awsConfig } from '../src/config';

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
	const configFlat: ConfigFlat = await readAllRecursive(configRoot);
	return processResults(configFlat, configRoot, schema);
};

async function readAllRecursive(configRoot: string): Promise<ConfigFlat> {
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
export function processResults<I, O, T extends z.ZodType<O, z.ZodTypeDef, I>>(
	configFlat: ConfigFlat,
	configRoot: string,
	schema: T,
): O {
	const configValuesByPathFromLeaf = configFlat.flatMap(Object.entries).map(
		([name, value]) =>
			({
				path: name
					.replace(configRoot, '')
					.replace(/^\//, '')
					.split('/')
					.filter((k) => k.length > 0)
					.reverse(),
				value,
			}) as PathWithValue,
	);
	const configTree = getTreeFromPaths(configValuesByPathFromLeaf);
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

export type ConfigFlat = Record<string, string>[];
type ConfigTree = string | { [p in string]: ConfigTree };
const getTreeFromPaths = (paths: PathWithValue[]): ConfigTree => {
	const singleItemTreesOrStringItem = paths.map(
		({ path, value }) =>
			path.reduce<ConfigTree>(
				(inside, nextLeaf) => ({ [nextLeaf]: inside }),
				value,
			),
		{},
	);
	return merge(singleItemTreesOrStringItem);
};

function merge(singleItemTreesOrStringItem: ConfigTree[]): ConfigTree {
	const maybeStringValue = singleItemTreesOrStringItem.find(
		(configTree) => typeof configTree === 'string',
	);
	if (maybeStringValue) {
		return maybeStringValue;
	}
	const singleItemTrees = singleItemTreesOrStringItem.filter(
		(a) => typeof a !== 'string',
	);
	const topLevelKeys = [...new Set(singleItemTrees.flatMap(Object.keys))];
	const topLevelGrouped = Object.fromEntries(
		topLevelKeys.map((key) => {
			const childTreesForKey = singleItemTrees.flatMap((obj) =>
				obj[key] ? [obj[key]] : [],
			);
			return [key, merge(childTreesForKey)];
		}),
	);
	return topLevelGrouped;
}

type PathWithValue = {
	path: string[];
	value: string;
};
