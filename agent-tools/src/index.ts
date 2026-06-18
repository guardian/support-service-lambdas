import { COMMANDS } from './commands.js';
import {
	closeExecutionOptions,
	type CommandResult,
	createExecutionOptions,
	toCommandResult,
} from './run.js';

function parseGlobalOptions(args: string[]):
	| {
			positionals: string[];
			tailLines: number | null;
			grepPattern: string | null;
	  }
	| CommandResult {
	const positionals: string[] = [];
	let tailLines: number | null = null;
	let grepPattern: string | null = null;

	for (let i = 0; i < args.length; i += 1) {
		const arg = args[i]!;
		if (arg === '--tail') {
			const raw = args[i + 1];
			if (!raw) {
				return toCommandResult(['FAIL --tail requires a numeric value'], 1);
			}
			const parsed = Number.parseInt(raw, 10);
			if (!Number.isFinite(parsed) || parsed <= 0) {
				return toCommandResult([`FAIL invalid --tail value: ${raw}`], 1);
			}
			tailLines = parsed;
			i += 1;
			continue;
		}
		if (arg === '--grep') {
			const raw = args[i + 1];
			if (!raw) {
				return toCommandResult(['FAIL --grep requires a regex pattern'], 1);
			}
			try {
				new RegExp(raw);
			} catch {
				return toCommandResult([`FAIL invalid --grep pattern: ${raw}`], 1);
			}
			grepPattern = raw;
			i += 1;
			continue;
		}
		positionals.push(arg);
	}

	return { positionals, tailLines, grepPattern };
}

function printResult(result: CommandResult): never {
	if (result.output.length > 0) {
		process.stdout.write(`${result.output}\n`);
	}
	process.exit(result.exitCode);
}

// pnpm run cli -- "$@" adds a leading -- separator; strip it before parsing
const rawArgs = process.argv.slice(2);
const parsed = parseGlobalOptions(
	rawArgs[0] === '--' ? rawArgs.slice(1) : rawArgs,
);
if ('exitCode' in parsed) {
	printResult(parsed);
}

const execOptions = createExecutionOptions({
	verbose: true,
	tailLines: parsed.tailLines,
	grepPattern: parsed.grepPattern,
});
if (execOptions.logFilePath) {
	process.stdout.write(`INFO full output log: ${execOptions.logFilePath}\n`);
}

const [rawCommand, ...cmdArgs] = parsed.positionals;

let result: CommandResult;
try {
	if (!rawCommand) {
		result =
			(await COMMANDS['help']?.handler([], execOptions)) ?? toCommandResult([]);
	} else {
		const command = COMMANDS[rawCommand];
		if (command) {
			result = await command.handler(cmdArgs, execOptions);
		} else {
			const helpOutput = await COMMANDS['help']?.handler([], execOptions);
			result = { output: helpOutput?.output ?? '', exitCode: 1 };
		}
	}
} finally {
	closeExecutionOptions(execOptions);
}
printResult(result);
