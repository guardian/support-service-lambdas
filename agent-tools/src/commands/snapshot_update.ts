import { runNoArgCommand } from '../cli/commandArgs.js';
import type { CommandResult, ExecutionOptions } from '../tools/runScript.js';
import {
	printProgress,
	runRootCommand,
	toCommandResult,
} from '../tools/runScript.js';
import type { CommandDefinition } from './types.js';

const SNAPSHOT_TIMEOUT_SECONDS = 600;

async function runSnapshotUpdate(
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

export default {
	name: 'snapshot_update',
	usage: '',
	description: 'run pnpm snapshot:update at repo root',
	category: 'Workspace',
	handler: (args, context) =>
		runNoArgCommand(args, 'snapshot_update', () =>
			runSnapshotUpdate(context.execOptions),
		),
} satisfies CommandDefinition;
