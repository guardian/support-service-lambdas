import * as fs from 'fs';

export interface ParsedArgs {
	mode: 'generate' | 'clean';
	repoRoot: string;
}

export function parseArguments(argv: string[]): ParsedArgs {
	const args = argv.slice(2);

	const syntax =
		'Syntax: cli.ts <REPO_ROOT> --generate|--clean\nActual: ' + argv.join(' ');

	if (args.length < 2) {
		throw new Error(
			'REPO_ROOT and a mode (--generate or --clean) must be provided\n' +
				syntax,
		);
	}

	const repoRoot = args[0];

	if (
		!fs.existsSync(repoRoot) ||
		!repoRoot.startsWith('/') ||
		!repoRoot.endsWith('support-service-lambdas')
	) {
		throw new Error(`Invalid repository root: ${repoRoot}\n${syntax}`);
	}

	const dashes = args[1].substring(0, 2);
	const mode = args[1].substring(2);
	if (dashes !== '--' || (mode !== 'generate' && mode !== 'clean')) {
		throw new Error('Second argument must be --generate or --clean\n' + syntax);
	}

	return { mode, repoRoot };
}
