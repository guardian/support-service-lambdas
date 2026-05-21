import { handlerTemplates } from '../../src/dynamic/generated/generatedMappings';
import type { SeedGenerator } from '../types';

const truthyValues = new Set(['y', 'yes', 'true']);
const falsyValues = new Set(['n', 'no', 'false']);

function parseBoolean(value: string): boolean | undefined {
	if (truthyValues.has(value.toLowerCase())) {
		return true;
	}
	if (falsyValues.has(value.toLowerCase())) {
		return false;
	}
	return undefined;
}

function suggestedCommand(
	lambdaName: string | undefined,
	includeApiKey: boolean | undefined,
	includeOpenApiDoc: boolean | undefined,
): string {
	const name = lambdaName ?? '<lambdaName>';
	const apiKey =
		includeApiKey !== undefined ? (includeApiKey ? 'Y' : 'N') : 'Y';
	const openApi =
		includeOpenApiDoc !== undefined ? (includeOpenApiDoc ? 'Y' : 'N') : 'Y';
	return `pnpm new-api-lambda ${name} --includeApiKey=${apiKey} --includeOpenApiDoc=${openApi}`;
}

export interface GenerationOptions {
	lambdaName: string;
	includeApiKey: boolean;
	includeOpenApiDoc: boolean;
}

function parseArgs(argv: string[]): GenerationOptions | { error: string } {
	const errors: string[] = [];

	const lambdaName = argv[0];
	let includeApiKey: boolean | undefined;
	let includeOpenApiDoc: boolean | undefined;

	if (!lambdaName || !/^[a-z][a-z0-9-]+[a-z0-9]$/.test(lambdaName)) {
		errors.push(
			`Invalid lambda name '${lambdaName}'. Must be kebab-case, e.g. my-new-lambda.`,
		);
	}

	for (const arg of argv.slice(1)) {
		const match = /^--([^=]+)=(.+)$/.exec(arg);
		if (!match) {
			errors.push(`Unrecognised argument: ${arg}`);
			continue;
		}
		const [, flagName, flagValue] = match;
		if (flagName === 'includeApiKey') {
			const parsed = parseBoolean(flagValue);
			if (parsed === undefined) {
				errors.push(
					`Invalid value for --includeApiKey: '${flagValue}'. Must be Y or N.`,
				);
			} else {
				includeApiKey = parsed;
			}
		} else if (flagName === 'includeOpenApiDoc') {
			const parsed = parseBoolean(flagValue);
			if (parsed === undefined) {
				errors.push(
					`Invalid value for --includeOpenApiDoc: '${flagValue}'. Must be Y or N.`,
				);
			} else {
				includeOpenApiDoc = parsed;
			}
		} else {
			errors.push(`Unknown flag: --${flagName}`);
		}
	}

	if (includeApiKey === undefined) {
		errors.push('Missing required flag: --includeApiKey');
	}
	if (includeOpenApiDoc === undefined) {
		errors.push('Missing required flag: --includeOpenApiDoc');
	}

	if (
		errors.length > 0 ||
		includeApiKey === undefined ||
		includeOpenApiDoc === undefined
	) {
		const syntax = `Syntax: pnpm new-api-lambda <lambdaName> --includeApiKey=<Y|N> --includeOpenApiDoc=<Y|N>`;
		const suggested = `Suggested: ${suggestedCommand(
			/^[a-z][a-z0-9-]+[a-z0-9]$/.test(lambdaName) ? lambdaName : undefined,
			includeApiKey,
			includeOpenApiDoc,
		)}`;
		return { error: [syntax, suggested, ...errors].join('\n') };
	}

	return {
		lambdaName: lambdaName,
		includeApiKey,
		includeOpenApiDoc,
	};
}

export const postProcessCommands = (opts: GenerationOptions): string[] => [
	'pnpm --filter buildcheck snapshot:update',
	'pnpm install',
	'pnpm --filter cdk lint --fix',
	'pnpm fix-formatting',
	`pnpm --filter cdk test-update ${opts.lambdaName}`,
];

export const postProcessExpectedFiles = (opts: GenerationOptions): string[] => [
	`cdk/lib/__snapshots__/${opts.lambdaName}.test.ts.snap`,
	...handlerTemplates.map((t) => `handlers/${opts.lambdaName}/${t.targetPath}`),
	`handlers/${opts.lambdaName}/BUILDCHECK.md`,
];

export default {
	parseArgs,
	postProcessCommands,
	postProcessExpectedFiles,
	resolveTargetPath: (path: string, opts: GenerationOptions) =>
		path.replace(/_lambdaName_/g, opts.lambdaName),
} satisfies SeedGenerator<GenerationOptions>;
