import {
	type CommandResult,
	type ExecutionOptions,
	listGitChangedFilesForPaths,
	printProgress,
	runRootCommand,
	toCommandResult,
} from './runScript.js';

const INSTALL_TIMEOUT_SECONDS = 900;
const SNAPSHOT_TIMEOUT_SECONDS = 600;

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

export async function runSnapshotUpdate(
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	printProgress('RUN  snapshot_update (pnpm snapshot:update)');
	const result = await runRootCommand('pnpm', ['snapshot:update'], {
		execOptions,
		timeoutSeconds: SNAPSHOT_TIMEOUT_SECONDS,
	});
	const durationSeconds = Math.round(result.durationMs / 1000);
	if (result.passed) {
		return toCommandResult([`OK   snapshot_update (${durationSeconds}s)`]);
	}
	return toCommandResult(
		[
			`FAIL snapshot_update (${durationSeconds}s)`,
			...(result.excerpt ? [result.excerpt] : []),
		],
		1,
	);
}

export async function runInstallWorkspace(
	execOptions: ExecutionOptions,
	options: { frozen: boolean },
): Promise<CommandResult> {
	const args = options.frozen ? ['install', '--frozen-lockfile'] : ['install'];
	const modeLabel = options.frozen ? 'frozen-lockfile' : 'mutable';
	printProgress(`RUN  install_workspace (${modeLabel})`);
	const result = await runRootCommand('pnpm', args, {
		execOptions,
		timeoutSeconds: INSTALL_TIMEOUT_SECONDS,
	});
	const durationSeconds = Math.round(result.durationMs / 1000);
	if (!result.passed) {
		return toCommandResult(
			[
				`FAIL install_workspace (${durationSeconds}s)`,
				...(result.excerpt ? [result.excerpt] : []),
			],
			1,
		);
	}
	const changedFiles = listGitChangedFilesForPaths(WORKSPACE_FILES);
	return toCommandResult([
		`OK   install_workspace (${durationSeconds}s)`,
		`INFO mode: ${modeLabel}`,
		'INFO dependency-related files changed:',
		...(changedFiles.length > 0 ? changedFiles : ['(none)']),
	]);
}
