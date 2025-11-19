import {
	extractGeneratedFilenames,
	warningFileName,
} from '../data/snippets/BUILDCHECK.md';
import { generate } from './steps/generate';
import { parseArguments } from './util/argsParser';
import { deleteRepoFiles, readLines, writeFiles } from './util/file-writer';

// main entry point from pnpm
try {
	const { mode, repoRoot } = parseArguments(process.argv);

	const previouslyGeneratedFiles = extractGeneratedFilenames(
		readLines(repoRoot, warningFileName),
	);
	console.log('previouslyGeneratedFiles to delete', previouslyGeneratedFiles);

	switch (mode) {
		case 'generate': {
			deleteRepoFiles(repoRoot, previouslyGeneratedFiles);
			const files = generate();
			writeFiles(repoRoot, files);
			break;
		}
		case 'clean':
			deleteRepoFiles(repoRoot, previouslyGeneratedFiles);
			break;
	}
} catch (error) {
	console.error(error);
	process.exit(1);
}
