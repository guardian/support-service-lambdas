import { parseGlobalOptions } from './cli/globalOptions.js';
import { commandDefinitions } from './commands/registry.js';
import {
	closeExecutionOptions,
	createExecutionOptions,
} from './tools/runScript.js';
import type { CommandResult } from './tools/runScript.js';

const commandLookup = new Map(
	commandDefinitions.map((definition) => [definition.name, definition]),
);

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

const [rawCommand, ...args] = parsed.positionals;
const helpDef = commandLookup.get('help')!;

let result: CommandResult;
try {
	if (!rawCommand) {
		result = await helpDef.handler([], { execOptions });
	} else {
		const definition = commandLookup.get(rawCommand);
		if (!definition) {
			const helpResult = await helpDef.handler([], { execOptions });
			result = { output: helpResult.output, exitCode: 1 };
		} else {
			result = await definition.handler(args, { execOptions });
		}
	}
} finally {
	closeExecutionOptions(execOptions);
}
printResult(result);
