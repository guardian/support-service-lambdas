import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type { GenerationOptions } from '../../data/seeds/new-api-lambda';
import {
	handlerTemplates,
	seedTemplates,
} from '../dynamic/generated/generatedMappings';
import { applyTemplates } from '../dynamic/templater';
import type { SeedFileResult } from '../steps/insertChunks';
import { writeFiles } from '../util/file-writer';
import { insertIntoFile } from '../util/insertIntoFile';

type SeedOpts = GenerationOptions;

interface SeedModule {
	parseArgs: (argv: string[]) => SeedOpts | { error: string };
	postProcessCommand?: (opts: SeedOpts) => string;
	postProcessExpectedFiles?: (opts: SeedOpts) => string[];
}

export function runSeedCommand(
	seedName: string,
	seedArgv: string[],
	repoRoot: string,
): void {
	// 1. Resolve seed config and templates
	const seedNamesStr = Object.keys(seedTemplates).join(', ');
	if (!(seedName in seedTemplates)) {
		throw new Error(
			`Unknown seed: '${seedName}'. Available seeds: ${seedNamesStr}`,
		);
	}
	const templates = seedTemplates[seedName];

	// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment -- dynamic seed config discovery
	const seedModule: SeedModule = require(`../../data/seeds/${seedName}`);

	const parseResult = seedModule.parseArgs(seedArgv);

	if ('error' in parseResult) {
		process.stderr.write(`Error: ${parseResult.error}\n`);
		process.exit(1);
	}

	const opts = parseResult;
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- seed templates are typed as never for generic lookup; runtime correctness is ensured by the seed module's parseArgs
	const { files, insertions } = applyTemplates(opts as never, templates);

	// Resolve _lambdaName_ tokens in file targetPaths
	const resolvedFiles: SeedFileResult[] = files.map((f) => ({
		...f,
		targetPath: resolveTokens(f.targetPath, opts.lambdaName),
	}));
	const resolvedInsertions = insertions.map((ins) => ({
		...ins,
		targetPath: resolveTokens(ins.targetPath, opts.lambdaName),
	}));

	// 2. Precondition checks — all before any writes
	log('checking preconditions...');
	checkPreconditions(
		repoRoot,
		resolvedFiles,
		resolvedInsertions,
		opts.lambdaName,
	);

	// 3. Write seed files
	log('writing seed files...');
	writeFiles(repoRoot, resolvedFiles);

	// 4. Apply injections
	log('applying injections...');
	for (const insertion of resolvedInsertions) {
		insertIntoFile(repoRoot, insertion);
	}

	// 5. Run snapshot:update (regenerates managed files including new handler)
	log('running snapshot:update...');
	execSync('pnpm --filter buildcheck snapshot:update', {
		cwd: repoRoot,
		stdio: 'inherit',
	});

	// 6. Run post-process command if provided (CDK snapshot)
	const postProcessCmd = seedModule.postProcessCommand?.(opts);
	if (postProcessCmd) {
		log(`running post-process: ${postProcessCmd}`);
		execSync(postProcessCmd, { cwd: repoRoot, stdio: 'inherit' });
	}

	// 7. git add everything
	const postProcessFiles = seedModule.postProcessExpectedFiles?.(opts) ?? [];
	const allPaths = [
		...resolvedFiles.map((f) => f.targetPath),
		...resolvedInsertions.map((ins) => ins.targetPath),
		...expectedManagedFiles(opts.lambdaName),
		...postProcessFiles,
	];
	log('staging files...');
	execSync(`git add ${allPaths.map((p) => `"${p}"`).join(' ')}`, {
		cwd: repoRoot,
		stdio: 'inherit',
	});

	log('done. Next steps:');
	log('  1. Review the git diff');
	log(
		'  2. Push your branch — see handlers/HOWTO-create-lambda.md for deployment instructions',
	);
}

function resolveTokens(targetPath: string, lambdaName: string): string {
	return targetPath.replace(/_lambdaName_/g, lambdaName);
}

function checkPreconditions(
	repoRoot: string,
	files: SeedFileResult[],
	insertions: ReturnType<typeof applyTemplates>['insertions'],
	lambdaName: string,
): void {
	// Check lambda not already in build.ts
	const buildTsPath = path.join(repoRoot, 'buildcheck/data/build.ts');
	const buildTsContent = fs.readFileSync(buildTsPath, 'utf8');
	if (buildTsContent.includes(`name: '${lambdaName}'`)) {
		abort(
			`'${lambdaName}' is already registered in buildcheck/data/build.ts.\n` +
				`Check for uncommitted changes, resolve any issues, and try again.`,
		);
	}

	// Check handler directory doesn't exist
	const handlerDir = path.join(repoRoot, 'handlers', lambdaName);
	if (fs.existsSync(handlerDir)) {
		abort(
			`handlers/${lambdaName}/ already exists.\n` +
				`Check for uncommitted changes, resolve any issues, and try again.`,
		);
	}

	// Check no seed file already exists
	for (const file of files) {
		const fullPath = path.join(repoRoot, file.targetPath);
		if (fs.existsSync(fullPath)) {
			abort(
				`Seed file already exists: ${file.targetPath}\n` +
					`Check for uncommitted changes, resolve any issues, and try again.`,
			);
		}
	}

	// Check all markers exist in injection targets
	for (const insertion of insertions) {
		const fullPath = path.join(repoRoot, insertion.targetPath);
		const content = fs.readFileSync(fullPath, 'utf8');
		for (const chunk of insertion.chunks) {
			if (!content.includes(chunk.marker)) {
				abort(
					`Marker '${chunk.marker}' not found in ${insertion.targetPath}.\n` +
						`This may indicate the file was manually edited. Check for uncommitted changes, resolve any issues, and try again.`,
				);
			}
		}
	}
}

function expectedManagedFiles(lambdaName: string): string[] {
	return [
		...handlerTemplates.map((t) => `handlers/${lambdaName}/${t.targetPath}`),
		`handlers/${lambdaName}/BUILDCHECK.md`,
		'BUILDCHECK.md',
	];
}

function log(message: string): void {
	console.log(`new-api-lambda: ${message}`);
}

function abort(message: string): never {
	process.stderr.write(`Error: ${message}\n`);
	process.exit(1);
}
