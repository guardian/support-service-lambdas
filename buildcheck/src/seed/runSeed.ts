import { execSync } from 'child_process';
import type { DirConfig } from '../../data/seeds/types';
import type { GeneratedFile } from '../dynamic/templater';
import { applyTemplates } from '../dynamic/templater';
import { assertFilesExist, writeFiles } from '../util/file-writer';
import { assertMarkersPresent, insertIntoFiles } from '../util/fileInserter';

export function runSeed<P>(repoRoot: string, entry: DirConfig<P>, opts: P) {
	const { files, insertions } = applyTemplates(opts, entry.templates);

	const resolvedFiles: GeneratedFile[] = files.map((file) => ({
		...file,
		targetPath: entry.index.resolveTargetPath(file.targetPath, opts),
	}));

	console.log('checking preconditions...');
	assertFilesExist(repoRoot, resolvedFiles);
	assertMarkersPresent(repoRoot, insertions);

	console.log('writing seed files...');
	writeFiles(repoRoot, resolvedFiles);

	console.log('applying injections...');
	insertIntoFiles(repoRoot, insertions);

	entry.index.postProcessCommands(opts).forEach((command) => {
		console.log(`running post-process: ${command}`);
		execSync(command, { cwd: repoRoot, stdio: 'inherit' });
	});

	const allPaths = resolvedFiles.map((f) => f.targetPath);
	console.log('staging files...');
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
