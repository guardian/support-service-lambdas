import { z } from 'zod';
import { handlerTemplates } from '../../../src/dynamic/generated/generatedMappings';
import { booleanFlag, kebabCaseSchema } from '../../snippets/string';
import type { SeedIndex } from '../../types';

const argsSchema = z.object({
	lambdaName: kebabCaseSchema,
	includeApiKey: booleanFlag,
	includeOpenApiDoc: booleanFlag,
});

export type GenerationOptions = z.infer<typeof argsSchema>;

const postProcessCommands = (opts: GenerationOptions): string[] => {
	const expectedFiles = [
		`cdk/lib/__snapshots__/${opts.lambdaName}.test.ts.snap`,
		...handlerTemplates.map(
			(t) => `handlers/${opts.lambdaName}/${t.targetPath}`,
		),
		`handlers/${opts.lambdaName}/BUILDCHECK.md`,
	];
	return [
		'pnpm --filter buildcheck snapshot:update',
		'pnpm install',
		'pnpm --filter cdk lint --fix',
		'pnpm fix-formatting',
		`pnpm --filter cdk test-update ${opts.lambdaName}`,
		`git add ${expectedFiles.map((p) => `"${p}"`).join(' ')}`,
	];
};

export default {
	argsSchema,
	postProcessCommands,
	resolveTargetPath: (path: string, opts: GenerationOptions) =>
		path.replace(/_lambdaName_/g, opts.lambdaName),
} satisfies SeedIndex<GenerationOptions>;
