import * as fs from 'fs';

export interface ParsedArgs {
	repoRoot: string;
	maybePackageName?: string;
}

export function parseArguments(argv: string[]): ParsedArgs {
	const args = argv.slice(2);

	if (args.length === 0) {
		throw new Error('Repository root path must be provided as first argument');
	}

	const repoRoot = args[0];
	const packageArgs = args.slice(1);

	if (
		!fs.existsSync(repoRoot) ||
		!repoRoot.startsWith('/') ||
		!repoRoot.endsWith('support-service-lambdas')
	) {
		throw new Error(`Invalid repository root: ${repoRoot}`);
	}

	return {
		repoRoot,
		maybePackageName: packageArgs.length > 0 ? packageArgs[0] : undefined,
	};
}
