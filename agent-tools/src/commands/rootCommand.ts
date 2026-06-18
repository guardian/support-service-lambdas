import { runNoArgCommand, runSingleTargetCommand } from '../cli/commandArgs.js';
import type {
	CommandResult,
	ExecutionOptions,
	ScriptResult,
} from '../tools/runScript.js';
import { printProgress, runRootCommand } from '../tools/runScript.js';
import type { CommandCategory, CommandDefinition } from './types.js';

function parseArgsString(argsString: string): string[] {
	return argsString.split(' ').filter(Boolean);
}

function formatRootResult(name: string, result: ScriptResult): CommandResult {
	const durationSeconds = Math.round(result.durationMs / 1000);
	if (result.passed) {
		return { output: `OK   ${name} (${durationSeconds}s)`, exitCode: 0 };
	}
	const lines = [
		`FAIL ${name} (${durationSeconds}s)`,
		...(result.excerpt ? [result.excerpt] : []),
	];
	return { output: lines.join('\n'), exitCode: result.exitCode };
}

async function execRootCommand(
	name: string,
	executable: string,
	args: string[],
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	printProgress(`RUN  ${name}`);
	const result = await runRootCommand(executable, args, { execOptions });
	return formatRootResult(name, result);
}

/** Builds a CommandDefinition for a no-arg command run at the repo root. */
export function rootCommand(
	name: string,
	category: CommandCategory,
	commandString: string,
): CommandDefinition {
	const [executable, ...args] = parseArgsString(commandString);
	return {
		name,
		usage: '',
		description: commandString,
		category,
		handler: (cmdArgs, context) =>
			runNoArgCommand(cmdArgs, name, () =>
				execRootCommand(name, executable!, args, context.execOptions),
			),
	};
}

/**
 * Like rootCommand but appends -- <target> to the args.
 * Used for commands like git diff that scope to a single repo target path.
 */
export function rootTargetCommand(
	name: string,
	category: CommandCategory,
	commandString: string,
): CommandDefinition {
	const [executable, ...args] = parseArgsString(commandString);
	return {
		name,
		usage: '<target>',
		description: `${commandString} for one target`,
		category,
		handler: (cmdArgs, context) =>
			runSingleTargetCommand(cmdArgs, name, (target) =>
				execRootCommand(
					name,
					executable!,
					[...args, '--', target],
					context.execOptions,
				),
			),
	};
}
