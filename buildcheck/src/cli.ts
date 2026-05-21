import {
	extractGeneratedFilenames,
	warningFileName,
} from '../data/snippets/BUILDCHECK.md';
import { runSeedCommand } from './commands/runSeedCommand';
import { generate } from './steps/generate';
import { parseArguments } from './util/argsParser';
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
		case 'seed':
			runSeedCommand(otherArgs.seedName, otherArgs.seedArgv, repoRoot);
			break;
	}
} catch (error) {
	console.error(error);
	process.exit(1);
}
