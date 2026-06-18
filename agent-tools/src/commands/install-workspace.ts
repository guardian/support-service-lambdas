import { fail } from '../cli/commandArgs.js';
import type { CommandResult, ExecutionOptions } from '../tools/runScript.js';
import {
	listGitChangedFilesForPaths,
	printProgress,
	runRootCommand,
	toCommandResult,
} from '../tools/runScript.js';
import type { CommandDefinition } from './types.js';

const INSTALL_TIMEOUT_SECONDS = 900;

const WORKSPACE_FILES = [
	'pnpm-lock.yaml',
	'pnpm-workspace.yaml',
	'package.json',
	'handlers/*/package.json',
	'modules/*/package.json',
	'cdk/package.json',
	'buildcheck/package.json',
	'agent-tools/package.json',
];

function parseInstallOptions(
	args: string[],
): CommandResult | { frozen: boolean } {
	if (args.length === 0) {
		return { frozen: true };
	}
	if (args.length === 1 && args[0] === '--no-frozen') {
		return { frozen: false };
	}
	return fail('install-workspace accepts only optional --no-frozen');
}

async function runInstallWorkspace(
	execOptions: ExecutionOptions,
	options: { frozen: boolean },
): Promise<CommandResult> {
	const args = options.frozen ? ['install', '--frozen-lockfile'] : ['install'];
	const modeLabel = options.frozen ? 'frozen-lockfile' : 'mutable';
	printProgress(`RUN  install-workspace (${modeLabel})`);
	const result = await runRootCommand('pnpm', args, {
		execOptions,
		timeoutSeconds: INSTALL_TIMEOUT_SECONDS,
	});
	const durationSeconds = Math.round(result.durationMs / 1000);
	if (!result.passed) {
		return toCommandResult(
			[
				`FAIL install-workspace (${durationSeconds}s)`,
				...(result.excerpt ? [result.excerpt] : []),
			],
			1,
		);
	}
	const changedFiles = listGitChangedFilesForPaths(WORKSPACE_FILES);
	return toCommandResult([
		`OK   install-workspace (${durationSeconds}s)`,
		`INFO mode: ${modeLabel}`,
		'INFO dependency-related files changed:',
		...(changedFiles.length > 0 ? changedFiles : ['(none)']),
	]);
}

export default {
	name: 'install-workspace',
	usage: '[--no-frozen]',
	description: 'run pnpm install (default --frozen-lockfile)',
	category: 'Workspace',
	safetyNote:
		'install-workspace is mutating; default mode is --frozen-lockfile',
	handler: async (args, context) => {
		const options = parseInstallOptions(args);
		if ('exitCode' in options) {
			return options;
		}
		return await runInstallWorkspace(context.execOptions, options);
	},
} satisfies CommandDefinition;
