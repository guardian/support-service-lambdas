import {
	extractGeneratedFilenames,
	warningFileName,
} from '../data/snippets/BUILDCHECK.md';
import { getSeedEntryOrThrow } from './seed/args/getSeedEntry';
import { recordFromFlags } from './seed/args/recordFromFlags';
import { validateFlags } from './seed/args/validateFlags';
import { runSeed } from './seed/runSeed';
import { generate } from './steps/generate';
import { parseArguments } from './util/argsParser';
import { deleteRepoFiles, readLines, writeFiles } from './util/file-writer';

// main entry point from pnpm
void (async () => {
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
				const seedName = otherArgs.seedName;

				const entry = getSeedEntryOrThrow(seedName);

				const opts = await validateFlags(
					entry.index.argsSchema,
					`pnpm seed ${seedName}`,
					recordFromFlags(otherArgs.seedArgv),
				);

				runSeed(repoRoot, entry, opts);

				break;
			}
		}
	} catch (error) {
		console.error(error);
		process.exit(1);
	}
})();
