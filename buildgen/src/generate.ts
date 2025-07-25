import { generatorConfig } from './data/config';
import { generateSteps } from './steps/generateSteps';
import { parseArguments } from './util/argsParser';
import { writeFiles } from './util/file-writer';

// main entry point for the generate task
try {
	const { repoRoot, maybePackageName } = parseArguments(process.argv);

	const files = generateSteps(generatorConfig, maybePackageName);

	writeFiles(repoRoot, files);
} catch (error) {
	console.error(`Error: ${error}`);
	process.exit(1);
}
