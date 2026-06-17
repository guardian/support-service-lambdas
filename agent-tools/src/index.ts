import { parseGlobalOptions } from './cli/globalOptions.js';
import { buildHelpLines } from './cli/helpText.js';
import { categoryOrder, commandDefinitions } from './commands/registry.js';
import {
	closeExecutionOptions,
	createExecutionOptions,
	toCommandResult,
} from './tools/runScript.js';
import type { CommandResult } from './tools/runScript.js';

const commandLookup = new Map(
	commandDefinitions.map((definition) => [definition.name, definition]),
);

function help(exitCode = 0): CommandResult {
	return toCommandResult(
		buildHelpLines(commandDefinitions, categoryOrder),
		exitCode,
	);
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

const [rawCommand, ...args] = parsed.positionals;
if (!rawCommand || rawCommand === 'help') {
	printResult(help());
}

const definition = commandLookup.get(rawCommand);
if (!definition) {
	printResult(help(1));
}

const execOptions = createExecutionOptions({
	verbose: true,
	tailLines: parsed.tailLines,
	grepPattern: parsed.grepPattern,
});
if (execOptions.logFilePath) {
	process.stdout.write(`INFO full output log: ${execOptions.logFilePath}\n`);
}

let result: CommandResult;
try {
	result = await definition.handler(args, { execOptions });
} finally {
	closeExecutionOptions(execOptions);
}
printResult(result);
