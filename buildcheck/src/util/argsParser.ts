import * as fs from 'fs';

interface GenerateOrCleanArgs {
	mode: 'generate' | 'clean';
	repoRoot: string;
}

interface SeedArgs {
	mode: 'seed';
	seedName: string;
	seedArgv: string[];
	repoRoot: string;
}

export type ParsedArgs = GenerateOrCleanArgs | SeedArgs;

export function parseArguments(argv: string[]): ParsedArgs {
	const args = argv.slice(2);

	const syntax =
		'Syntax: cli.ts <REPO_ROOT> --generate|--clean\n' +
		'        cli.ts <REPO_ROOT> --seed <seedName> [seedArgs...]\n' +
		'Actual: ' +
		argv.join(' ');

	if (args.length < 2) {
		throw new Error(
			'REPO_ROOT and a mode (--generate, --clean or --seed) must be provided\n' +
				syntax,
		);
	}

	const repoRoot = args[0];

	if (!repoRoot || !fs.existsSync(repoRoot) || !repoRoot.startsWith('/')) {
		throw new Error(`Invalid repository root: ${repoRoot}\n${syntax}`);
	}

	const dashes = args[1].substring(0, 2);
	const mode = args[1].substring(2);
	if (
		dashes !== '--' ||
		(mode !== 'generate' && mode !== 'clean' && mode !== 'seed')
	) {
		throw new Error(
			'Second argument must be --generate, --clean or --seed\n' + syntax,
		);
	}

	if (mode === 'seed') {
		if (args.length < 3) {
			throw new Error('--seed requires a seed name\n' + syntax);
		}
		const seedName = args[2];
		const seedArgv = args.slice(3);
		return { mode, seedName, seedArgv, repoRoot };
	}

	return { mode, repoRoot };
}

/**
 * Converts an array of --key=value flag strings into a Record<string, string>.
 * Flags not matching --key=value are ignored (they will fail zod validation).
 */
export function parseFlags(argv: string[]): Record<string, string> {
	const result: Record<string, string> = {};
	for (const arg of argv) {
		const match = /^--([^=]+)=(.+)$/.exec(arg);
		if (match) {
			result[match[1]] = match[2];
		}
	}
	return result;
}
