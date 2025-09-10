import { generate } from './steps/generate';
import {
	writeFiles,
	loadGeneratedFileNames,
	deleteRepoFiles,
} from './util/file-writer';
import { parseArguments } from './util/argsParser';
import { warningFileName } from './data/snippets/buildgenREADME.txt';

// main entry point from pnpm
try {
	const { mode, repoRoot } = parseArguments(process.argv);

	const previouslyGeneratedFiles = loadGeneratedFileNames(
		repoRoot,
		warningFileName,
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
