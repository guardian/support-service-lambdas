import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { seedConfigs } from '../dynamic/generated/generatedSeedMappings';
import { applyTemplates } from '../dynamic/templater';
import type { SeedFileResult } from '../steps/insertChunks';
import { writeFiles } from '../util/file-writer';
import { insertIntoFile } from '../util/insertIntoFile';
import { parseFlags } from '../util/parseFlags';

export function runSeedCommand(
	seedName: string,
	seedArgv: string[],
	repoRoot: string,
): void {
	if (!(seedName in seedConfigs)) {
		throw new Error(
			`Unknown seed: '${seedName}'. Available seeds: ${Object.keys(seedConfigs).join(', ')}`,
		);
	}

	runValidSeed(seedName, seedArgv, repoRoot);
}

function runValidSeed<S extends keyof typeof seedConfigs>(
	seedName: S,
	seedArgv: string[],
	repoRoot: string,
) {
	const seedConfig = seedConfigs[seedName];

	const flags = parseFlags(seedArgv);
	const parseResult = seedConfig.argsSchema.safeParse(flags);

	if (!parseResult.success) {
		const shape = seedConfig.argsSchema.shape;
		const schemaKeys = Object.keys(shape);
		const failedKeys = new Set(
			parseResult.error.errors.map((e) => e.path[0]?.toString()),
		);
		const syntax = `Syntax: pnpm ${seedName}-next ${schemaKeys
			.map((k) => {
				const description = shape[k].description ?? 'value';
				return `--${k}=<${description}>`;
			})
			.join(' ')}`;
		const suggested = `Suggested: pnpm ${seedName}-next ${schemaKeys
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
		process.exit(1);
	}

	const opts = parseResult.data;
	const { files, insertions } = applyTemplates(opts, seedConfig.templates);

	const resolvedFiles: SeedFileResult[] = files.map((f) => ({
		...f,
		targetPath: seedConfig.resolveTargetPath(f.targetPath, opts),
	}));

	log(seedName, 'checking preconditions...');
	checkPreconditions(repoRoot, resolvedFiles, insertions);

	log(seedName, 'writing seed files...');
	writeFiles(repoRoot, resolvedFiles);

	log(seedName, 'applying injections...');
	for (const insertion of insertions) {
		insertIntoFile(repoRoot, insertion);
	}

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

	log(seedName, 'done. Next steps:');
	log(seedName, '  1. Review the git diff');
	log(
		seedName,
		'  2. Push your branch — see handlers/HOWTO-create-lambda.md for deployment instructions',
	);
}

function checkPreconditions(
	repoRoot: string,
	files: SeedFileResult[],
	insertions: ReturnType<typeof applyTemplates>['insertions'],
): void {
	for (const file of files) {
		const fullPath = path.join(repoRoot, file.targetPath);
		if (fs.existsSync(fullPath)) {
			throw new Error(
				`Seed file already exists: ${file.targetPath}\n` +
					`Check for uncommitted changes, resolve any issues, and try again.`,
			);
		}
	}

	for (const insertion of insertions) {
		const fullPath = path.join(repoRoot, insertion.targetPath);
		const content = fs.readFileSync(fullPath, 'utf8');
		for (const chunk of insertion.chunks) {
			if (!content.includes(chunk.marker)) {
				throw new Error(
					`Marker '${chunk.marker}' not found in ${insertion.targetPath}.\n` +
						`This may indicate the file was manually edited. Check for uncommitted changes, resolve any issues, and try again.`,
				);
			}
		}
	}
}

function log(seedName: string, message: string): void {
	console.log(`${seedName}: ${message}`);
}
