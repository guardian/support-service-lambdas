import { z } from 'zod';
import { toTargetPath } from '../../../src/dynamic/templater';
import templates from '../../managed/handler/_generated_tsIndex';
import { booleanFlag, kebabCaseSchema } from '../../snippets/string';
import type { SeedIndex } from '../types';

const argsSchema = z.object({
	lambdaName: kebabCaseSchema,
	includeApiKey: booleanFlag,
	includeOpenApiDoc: booleanFlag,
});

export type TemplateParams = z.infer<typeof argsSchema>;

const postProcessCommands = (opts: TemplateParams): string[] => {
	const expectedFiles = [
		`cdk/lib/__snapshots__/${opts.lambdaName}.test.ts.snap`,
		...templates.map((t) =>
			toTargetPath(`handlers/${opts.lambdaName}/${t.relativeName}`),
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
	resolveTargetPath: (path: string, opts: TemplateParams) =>
		path.replace(/_lambdaName_/g, opts.lambdaName),
} satisfies SeedIndex<TemplateParams>;
