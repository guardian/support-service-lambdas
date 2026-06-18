import { runNoArgCommand } from '../cli/commandArgs.js';
import type { CommandResult, ExecutionOptions } from '../tools/runScript.js';
import {
	printProgress,
	runRootCommand,
	toCommandResult,
} from '../tools/runScript.js';
import type { CommandDefinition } from './types.js';

async function runInstallWorkspace(
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	printProgress('RUN  install-workspace (pnpm install)');
	const result = await runRootCommand('pnpm', ['install'], { execOptions });
	const durationSeconds = Math.round(result.durationMs / 1000);
	if (result.passed) {
		return toCommandResult([`OK   install-workspace (${durationSeconds}s)`]);
	}
	return toCommandResult(
		[
			`FAIL install-workspace (${durationSeconds}s)`,
			...(result.excerpt ? [result.excerpt] : []),
		],
		1,
	);
}

export default {
	name: 'install-workspace',
	usage: '',
	description: 'run pnpm install at repo root',
	category: 'Workspace',
	handler: (args, context) =>
		runNoArgCommand(args, 'install-workspace', () =>
			runInstallWorkspace(context.execOptions),
		),
} satisfies CommandDefinition;
