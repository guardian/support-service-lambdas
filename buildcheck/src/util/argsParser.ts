import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface ParsedArgs {
	mode: 'generate' | 'clean';
	repoRoot: string;
}

function assertSupportedCheckout(repoRoot: string): void {
	if (!path.isAbsolute(repoRoot)) {
		throw new Error(`Repository root must be an absolute path: ${repoRoot}`);
	}

	if (!fs.existsSync(repoRoot) || !fs.statSync(repoRoot).isDirectory()) {
		throw new Error(
			`Repository root must be an existing directory: ${repoRoot}`,
		);
	}

	const git = (...args: string[]) => {
		try {
			return execFileSync('git', ['-C', repoRoot, ...args], {
				encoding: 'utf8',
				stdio: ['ignore', 'pipe', 'pipe'],
			}).trim();
		} catch (error) {
			throw new Error(
				`Unable to inspect Git checkout at ${repoRoot} using git ${args.join(' ')}: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		}
	};

	const checkoutRoot = git('rev-parse', '--show-toplevel');
	if (fs.realpathSync(repoRoot) !== fs.realpathSync(checkoutRoot)) {
		throw new Error(
			`Repository root must be the Git working-tree root: ${checkoutRoot}. Received: ${repoRoot}`,
		);
	}

	const hasSupportedRemote = git('remote', '-v')
		.split('\n')
		.some((remote) =>
			(remote.split(/\s+/)[1] ?? '').includes(
				'guardian/support-service-lambdas',
			),
		);
	if (!hasSupportedRemote) {
		throw new Error(
			`Git checkout at ${repoRoot} must have a remote containing guardian/support-service-lambdas.`,
		);
	}
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
	assertSupportedCheckout(repoRoot);

	return {
		// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- todo use zod above
		mode: mode.substring(2) as 'generate' | 'clean',
		repoRoot,
	};
}
