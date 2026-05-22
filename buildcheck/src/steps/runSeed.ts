import { execSync } from 'child_process';
import type { SeedIndex } from '../../data/types';
import { seedConfigs } from '../dynamic/generated/generatedSeedMappings';
import type { GeneratedFile } from '../dynamic/templater';
import { applyTemplates, type Template } from '../dynamic/templater';
import { assertFilesExist, writeFiles } from '../util/file-writer';
import { assertMarkersPresent, insertIntoFiles } from '../util/fileInserter';

export type SeedConfig<T> = SeedIndex<T> & {
	templates: Array<Template<T>>;
};

function parseFlags(
	seedConfig: SeedConfig<never>,
	seedName: string,
	flags: Record<string, string>,
) {
	const parseResult = seedConfig.argsSchema.safeParse(flags);

	if (parseResult.success) {
		return parseResult.data;
	}
	const shape = seedConfig.argsSchema.shape;
	const schemaKeys = Object.keys(shape);
	const failedKeys = new Set(
		parseResult.error.errors.map((e) => e.path[0]?.toString()),
	);
	const syntax = `Syntax: pnpm --filter buildcheck seed ${seedName} ${schemaKeys
		.map((k) => {
			const description = shape[k].description ?? 'value';
			return `--${k}=<${description}>`;
		})
		.join(' ')}`;
	const suggested = `Suggested: pnpm --filter buildcheck seed ${seedName} ${schemaKeys
		.map((k) => {
			const description = shape[k].description ?? k;
			const value =
				k in flags && !failedKeys.has(k) ? flags[k] : `<${description}>`;
			return `--${k}=${value}`;
		})
		.join(' ')}`;
	const errors = parseResult.error.errors.map(
		(e) => `  --${e.path.join('.')}: ${e.message}`,
	);
	process.stderr.write([syntax, suggested, ...errors].join('\n') + '\n');
	throw new Error('syntax error');
}

export function runSeed<S extends keyof typeof seedConfigs>(
	seedName: S,
	flags: Record<string, string>,
	repoRoot: string,
) {
	const seedConfig = seedConfigs[seedName];

	const opts = parseFlags(seedConfig, seedName, flags);

	const { files, insertions } = applyTemplates(opts, seedConfig.templates);

	const resolvedFiles: GeneratedFile[] = files.map((file) => ({
		...file,
		targetPath: seedConfig.resolveTargetPath(file.targetPath, opts),
	}));

	log(seedName, 'checking preconditions...');
	assertFilesExist(repoRoot, resolvedFiles);
	assertMarkersPresent(repoRoot, insertions);

	log(seedName, 'writing seed files...');
	writeFiles(repoRoot, resolvedFiles);

	log(seedName, 'applying injections...');
	insertIntoFiles(repoRoot, insertions);

	seedConfig.postProcessCommands(opts).forEach((command) => {
		log(seedName, `running post-process: ${command}`);
		execSync(command, { cwd: repoRoot, stdio: 'inherit' });
	});

	const allPaths = resolvedFiles.map((f) => f.targetPath);
	log(seedName, 'staging files...');
	execSync(`git add ${allPaths.map((p) => `"${p}"`).join(' ')}`, {
		cwd: repoRoot,
		stdio: 'inherit',
	});

	console.log(seedName, '\n\ndone. Next steps:');
	console.log(seedName, '  1. Review the git diff');
	console.log(
		seedName,
		'  2. Push your branch — see handlers/HOWTO-create-lambda.md for deployment instructions',
	);
}

function log(seedName: string, message: string): void {
	console.log(`${seedName}: ${message}`);
}
