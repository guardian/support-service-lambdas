import { generate } from './steps/generate';
import { writeFiles, deleteRepoFiles, readLines } from './util/file-writer';
import { parseArguments } from './util/argsParser';
import {
	parseGeneratedFilenames,
	warningFileName,
} from './data/snippets/BUILDCHECK.md';

// main entry point from pnpm
try {
	const { mode, repoRoot } = parseArguments(process.argv);

	const previouslyGeneratedFiles = parseGeneratedFilenames(
		readLines(repoRoot, warningFileName),
	);
	console.log('previouslyGeneratedFiles to delete', previouslyGeneratedFiles);

	switch (mode) {
		case 'generate':
			deleteRepoFiles(repoRoot, previouslyGeneratedFiles);
			const files = generate();
			writeFiles(repoRoot, files);
			break;
		case 'clean':
			deleteRepoFiles(repoRoot, previouslyGeneratedFiles);
			break;
	}
} catch (error) {
	console.error(error);
	process.exit(1);
}
