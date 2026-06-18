import { runNoArgCommand } from '../cli/commandArgs.js';
import type { ExecutionOptions } from '../tools/runScript.js';
import {
	printProgress,
	runRootCommand,
	toCommandResult,
} from '../tools/runScript.js';
import type { CommandCategory, CommandDefinition } from './types.js';

async function runRootPnpmCommand(
	name: string,
	pnpmArgs: string[],
	execOptions: ExecutionOptions,
) {
	printProgress(`RUN  ${name}`);
	const result = await runRootCommand('pnpm', pnpmArgs, { execOptions });
	const durationSeconds = Math.round(result.durationMs / 1000);
	if (result.passed) {
		return toCommandResult([`OK   ${name} (${durationSeconds}s)`]);
	}
	return toCommandResult(
		[
			`FAIL ${name} (${durationSeconds}s)`,
			...(result.excerpt ? [result.excerpt] : []),
		],
		1,
	);
}

/** Builds a CommandDefinition for a no-arg pnpm command run at the repo root. */
export function rootPnpmCommand(
	name: string,
	category: CommandCategory,
	pnpmArgs: string[],
): CommandDefinition {
	return {
		name,
		usage: '',
		description: `run pnpm ${pnpmArgs.join(' ')} at repo root`,
		category,
		handler: (args, context) =>
			runNoArgCommand(args, name, () =>
				runRootPnpmCommand(name, pnpmArgs, context.execOptions),
			),
	};
}
