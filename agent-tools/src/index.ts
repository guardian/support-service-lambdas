import { COMMANDS } from './commands.js';
import {
	type CommandResult,
	createExecutionOptions,
	parseGlobalOptions,
	toCommandResult,
} from './run.js';

function printResult(result: CommandResult): never {
	if (result.output.length > 0) {
		process.stdout.write(`${result.output}\n`);
	}
	process.exit(result.exitCode);
}

const [rootDir, ...rawArgs] = process.argv.slice(2);
if (!rootDir) {
	process.stdout.write(
		'FAIL agent-tool requires a root directory as the first argument\n',
	);
	process.exit(1);
}
const parsed = parseGlobalOptions(rawArgs);
if ('exitCode' in parsed) {
	printResult(parsed);
}

const execOptions = createExecutionOptions({
	root: rootDir,
	verbose: true,
	tailLines: parsed.tailLines,
	grepPattern: parsed.grepPattern,
	contextLines: parsed.contextLines,
	all: parsed.all,
});

const [rawCommand, ...cmdArgs] = parsed.positionals;

let result: CommandResult;
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
printResult(result);
