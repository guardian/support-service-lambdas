import { z } from 'zod';
import { handlerTemplates } from '../../src/dynamic/generated/generatedMappings';
import type { SeedGenerator } from '../types';

const booleanFlag = z
	.string()
	.toLowerCase()
	.pipe(z.enum(['y', 'yes', 'true', 'n', 'no', 'false']))
	.transform((v) => ['y', 'yes', 'true'].includes(v));

const argsSchema = z.object({
	lambdaName: z
		.string()
		.regex(
			/^[a-z][a-z0-9-]+[a-z0-9]$/,
			'Must be kebab-case, at least 3 characters, e.g. my-new-lambda',
		),
	includeApiKey: booleanFlag,
	includeOpenApiDoc: booleanFlag,
});

export type GenerationOptions = z.infer<typeof argsSchema>;

const postProcessCommands = (opts: GenerationOptions): string[] => [
	'pnpm --filter buildcheck snapshot:update',
	'pnpm install',
	'pnpm --filter cdk lint --fix',
	'pnpm fix-formatting',
	`pnpm --filter cdk test-update ${opts.lambdaName}`,
];

const postProcessExpectedFiles = (opts: GenerationOptions): string[] => [
	`cdk/lib/__snapshots__/${opts.lambdaName}.test.ts.snap`,
	...handlerTemplates.map((t) => `handlers/${opts.lambdaName}/${t.targetPath}`),
	`handlers/${opts.lambdaName}/BUILDCHECK.md`,
];

export default {
	argsSchema,
	postProcessCommands,
	postProcessExpectedFiles,
	resolveTargetPath: (path: string, opts: GenerationOptions) =>
		path.replace(/_lambdaName_/g, opts.lambdaName),
} satisfies SeedGenerator<GenerationOptions>;
