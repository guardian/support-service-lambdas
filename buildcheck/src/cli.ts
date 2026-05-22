import {
	extractGeneratedFilenames,
	warningFileName,
} from '../data/snippets/BUILDCHECK.md';
import { seedConfigs } from './dynamic/generated/generatedSeedMappings';
import { generate } from './steps/generate';
import { runSeed } from './steps/runSeed';
import { parseArguments, parseFlags } from './util/argsParser';
import { deleteRepoFiles, readLines, writeFiles } from './util/file-writer';

// main entry point from pnpm
try {
	const { repoRoot, ...otherArgs } = parseArguments(process.argv);

	switch (otherArgs.mode) {
		case 'generate': {
			const previouslyGeneratedFiles = extractGeneratedFilenames(
				readLines(repoRoot, warningFileName),
			);
			deleteRepoFiles(repoRoot, previouslyGeneratedFiles);
			writeFiles(repoRoot, generate());
			break;
		}
		case 'clean': {
			const previouslyGeneratedFiles = extractGeneratedFilenames(
				readLines(repoRoot, warningFileName),
			);
			deleteRepoFiles(repoRoot, previouslyGeneratedFiles);
			break;
		}
		case 'seed': {
			if (!(otherArgs.seedName in seedConfigs)) {
				throw new Error(
					`Unknown seed: '${otherArgs.seedName}'. Available seeds: ${Object.keys(seedConfigs).join(', ')}`,
				);
			}

			const flags = parseFlags(otherArgs.seedArgv);
			runSeed(otherArgs.seedName, flags, repoRoot);
			break;
		}
	}
} catch (error) {
	console.error(error);
	process.exit(1);
}
