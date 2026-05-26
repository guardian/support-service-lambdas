import { execSync } from 'child_process';
import path from 'path';
import type { DirConfig } from '../../data/seeds/types';
import { seedsDirName } from '../../data/seeds/types';
import type { GeneratedFile } from '../dynamic/templater';
import { applyTemplates } from '../dynamic/templater';
import { assertFilesExist, writeFiles } from '../util/file-writer';
import { assertMarkersPresent, insertIntoFiles } from '../util/fileInserter';

export function runSeed<P>(
	seedName: string,
	repoRoot: string,
	entry: DirConfig<P>,
	opts: P,
) {
	const { files, insertions } = applyTemplates(
		opts,
		path.resolve(path.relative(repoRoot, seedsDirName), seedName, 'templates'),
		entry.templates,
	);

	const resolvedFiles: GeneratedFile[] = files.map((file) => ({
		...file,
		targetPath: entry.index.resolveTargetPath(file.targetPath, opts),
	}));

	log(seedName, 'checking preconditions...');
	assertFilesExist(repoRoot, resolvedFiles);
	assertMarkersPresent(repoRoot, insertions);

	log(seedName, 'writing seed files...');
	writeFiles(repoRoot, resolvedFiles);

	log(seedName, 'applying injections...');
	insertIntoFiles(repoRoot, insertions);

	entry.index.postProcessCommands(opts).forEach((command) => {
		log(seedName, `running post-process: ${command}`);
		execSync(command, { cwd: repoRoot, stdio: 'inherit' });
	});

	const allPaths = resolvedFiles.map((f) => f.targetPath);
	log(seedName, 'staging files...');
	execSync(`git add ${allPaths.map((p) => `"${p}"`).join(' ')}`, {
		cwd: repoRoot,
		stdio: 'inherit',
	});

	console.log('\n\ndone. Next steps:');
	console.log('  1. Review the git diff');
	console.log(
		'  2. Push your branch — see handlers/HOWTO-create-lambda.md for deployment instructions',
	);
}

function log(seedName: string, message: string): void {
	console.log(`${seedName}: ${message}`);
}
