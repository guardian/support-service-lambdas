import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { seedConfigs } from '../dynamic/generated/generatedSeedMappings';
import { applyTemplates } from '../dynamic/templater';
import type { SeedFileResult } from '../steps/insertChunks';
import { writeFiles } from '../util/file-writer';
import { insertIntoFile } from '../util/insertIntoFile';

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
	const seedConfig = seedConfigs[seedName];

	const parseResult = seedConfig.parseArgs(seedArgv);

	if ('error' in parseResult) {
		process.stderr.write(`Error: ${parseResult.error}\n`);
		process.exit(1);
	}

	const opts = parseResult;
	const { files, insertions } = applyTemplates(opts, seedConfig.templates);

	// Resolve seed-specific tokens in file targetPaths
	const resolvedFiles: SeedFileResult[] = files.map((f) => ({
		...f,
		targetPath: seedConfig.resolveTargetPath(f.targetPath, opts),
	}));
	const resolvedInsertions = insertions.map((ins) => ({
		...ins,
		targetPath: seedConfig.resolveTargetPath(ins.targetPath, opts),
	}));

	// 2. Precondition checks — all before any writes
	log(seedName, 'checking preconditions...');
	checkPreconditions(repoRoot, resolvedFiles, resolvedInsertions);

	// 3. Write seed files
	log(seedName, 'writing seed files...');
	writeFiles(repoRoot, resolvedFiles);

	// 4. Apply injections
	log(seedName, 'applying injections...');
	for (const insertion of resolvedInsertions) {
		insertIntoFile(repoRoot, insertion);
	}

	// 6. Run post-process steps if provided (e.g. CDK snapshot)
	seedConfig.postProcessCommands(opts).forEach((command) => {
		log(seedName, `running post-process: ${command}`);
		execSync(command, { cwd: repoRoot, stdio: 'inherit' });
	});

	// 7. git add everything
	const allPaths = [
		...resolvedFiles.map((f) => f.targetPath),
		...seedConfig.postProcessExpectedFiles(opts),
	];
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
	// Check handler directory doesn't exist
	for (const file of files) {
		const fullPath = path.join(repoRoot, file.targetPath);
		if (fs.existsSync(fullPath)) {
			throw new Error(
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
