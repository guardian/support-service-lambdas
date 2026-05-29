import { z } from 'zod';
import handlerIndex from '../../managed/handler/_generated_tsIndex';
import {
	booleanFlag,
	kebabCaseSchema,
	withPrompt,
} from '../../snippets/string';
import type { SeedIndex } from '../types';

const argsSchema = z.object({
	lambdaName: withPrompt(
		kebabCaseSchema,
		'Enter new lambda name e.g. widgets-query-sync',
	),
	includeApiKey: withPrompt(
		booleanFlag(true),
		'Should I generate an API key for this lambda?',
	),
	includeOpenApiDoc: withPrompt(
		booleanFlag(true),
		'Should I generate an Open API description for this lambda?',
	),
});

export type TemplateParams = z.infer<typeof argsSchema>;

const postProcessCommands = (opts: TemplateParams): string[] => {
	return [
		'pnpm --filter buildcheck snapshot:update',
		`git add ${handlerIndex.templates.map((t) => `"${toTargetPath(`handlers/${opts.lambdaName}/${t.relativeName}`)}"`).join(' ')}`,
		`git add "handlers/${opts.lambdaName}/BUILDCHECK.md"`,
		'pnpm install',
		'pnpm --filter cdk lint --fix',
		'pnpm fix-formatting',
		`pnpm --filter cdk test-update ${opts.lambdaName}`,
		`git add "cdk/lib/__snapshots__/${opts.lambdaName}.test.ts.snap"`,
	];
};

export default {
	argsSchema,
	postProcessCommands,
	resolveTargetPath: (path: string, opts: TemplateParams) =>
		path.replace(/_lambdaName_/g, opts.lambdaName),
} satisfies SeedIndex<TemplateParams>;

/** Derive the target path in the repo from a template filename (relative to templates/).
 *  e.g. `foo.json.ts`       -> `foo.json`
 *       `foo.ts.inserts.ts` -> `foo.ts`  (insertion: strip .inserts.ts)
 */
export function toTargetPath(relPath: string): string {
	if (relPath.endsWith('.inserts.ts')) {
		return relPath.slice(0, -'.inserts.ts'.length);
	}
	return relPath.endsWith('.ts') ? relPath.slice(0, -3) : relPath;
}
