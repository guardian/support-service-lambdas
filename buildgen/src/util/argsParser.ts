import * as fs from 'fs';

export interface ParsedArgs {
	mode: 'generate' | 'clean';
	repoRoot: string;
}

export function parseArguments(argv: string[]): ParsedArgs {
	const args = argv.slice(2);

	const syntax =
		'Syntax: cli.ts --generate|--clean <REPO_ROOT>\nActual: ' + argv.join(' ');

	if (args.length === 0) {
		throw new Error(
			'Mode (--generate or --clean) must be provided as first argument\n' +
				syntax,
		);
	}

	const mode = args[0];
	if (mode !== '--generate' && mode !== '--clean') {
		throw new Error('First argument must be --generate or --clean\n' + syntax);
	}

	if (args.length < 2) {
		throw new Error(
			'Repository root path must be provided as second argument\n' + syntax,
		);
	}

	const repoRoot = args[1];
	const packageArgs = args.slice(2);

	if (
		!fs.existsSync(repoRoot) ||
		!repoRoot.startsWith('/') ||
		!repoRoot.endsWith('support-service-lambdas')
	) {
		throw new Error(`Invalid repository root: ${repoRoot}`);
	}

	return {
		mode: mode.substring(2) as 'generate' | 'clean',
		repoRoot,
	};
}
