import { runGit, runGitForTarget } from './tools/git.js';
import { runRepair, runRepairChanged } from './tools/repair.js';
import { type CommandResult, toCommandResult } from './tools/runScript.js';
import { listTargetNames } from './tools/targetRegistry.js';
import {
	listTargets,
	showTargetScripts,
	validateTargetsTool,
} from './tools/targets.js';
import {
	runTest,
	runTestChanged,
	runTestFile,
	runTestOne,
} from './tools/test.js';
import { runVerify, runVerifyChanged } from './tools/verify.js';

const HELP_LINES = [
	'Usage:',
	'  ./agent-tool <command> [args...]',
	'',
	'Commands:',
	'  help',
	'  list_targets',
	'  validate_targets <target...>',
	'  show_target_scripts <target>',
	'  verify <target...>',
	'  verify_changed',
	'  repair <target...>',
	'  repair_changed',
	'  test <target...>',
	'  test_changed',
	'  test_one <target> <pattern>',
	'  test_file <target> <filePath>',
	'  git_status',
	'  git_diff',
	'  git_diff_target <target>',
	'  git_diff_staged',
	'  git_diff_stat',
	'  git_diff_target_stat <target>',
	'  git_diff_staged_stat',
	'  git_changed_files',
	'  git_changed_files_staged',
	'',
	'Notes:',
	'  - Targets must be under handlers/* or modules/*.',
	'  - Hyphenated aliases such as verify-changed are also accepted.',
];

const TARGET_RE = /^(handlers|modules)\/[a-zA-Z0-9._-]+$/;

function normalizeCommand(command: string): string {
	return command.replace(/-/g, '_');
}

function help(exitCode = 0): CommandResult {
	return toCommandResult(HELP_LINES, exitCode);
}

function fail(message: string): CommandResult {
	return toCommandResult([`FAIL ${message}`], 1);
}

function validateTargetArgs(
	targets: string[],
): Array<{ target: string; reason: string }> {
	const knownTargets = new Set(listTargetNames());
	return targets.flatMap((target) => {
		if (!TARGET_RE.test(target)) {
			return [
				{
					target,
					reason: 'invalid format (expected handlers/<name> or modules/<name>)',
				},
			];
		}
		if (!knownTargets.has(target)) {
			return [{ target, reason: 'target does not exist' }];
		}
		return [];
	});
}

function requireTargets(
	args: string[],
	command: string,
): CommandResult | { targets: string[] } {
	if (args.length === 0) {
		return fail(`${command} requires at least one target`);
	}
	const invalid = validateTargetArgs(args);
	if (invalid.length > 0) {
		return toCommandResult(
			invalid.map((result) => `FAIL ${result.target}: ${result.reason}`),
			1,
		);
	}
	return { targets: args };
}

function requireTarget(
	args: string[],
	command: string,
): CommandResult | { target: string } {
	if (args.length !== 1) {
		return fail(`${command} requires exactly one target`);
	}
	const targets = requireTargets(args, command);
	if ('exitCode' in targets) {
		return targets;
	}
	return { target: targets.targets[0]! };
}

function printResult(result: CommandResult): never {
	const stream = result.exitCode === 0 ? process.stdout : process.stderr;
	if (result.output.length > 0) {
		stream.write(`${result.output}\n`);
	}
	process.exit(result.exitCode);
}

const cliArgs = process.argv.slice(2);
const normalizedArgs = cliArgs[0] === '--' ? cliArgs.slice(1) : cliArgs;
const [rawCommand, ...args] = normalizedArgs;

if (
	!rawCommand ||
	rawCommand === 'help' ||
	rawCommand === '--help' ||
	rawCommand === '-h'
) {
	printResult(help());
}

const command = normalizeCommand(rawCommand);
let result: CommandResult;

switch (command) {
	case 'list_targets':
		result = listTargets();
		break;
	case 'validate_targets':
		result =
			args.length === 0
				? fail('validate_targets requires at least one target')
				: validateTargetsTool(args);
		break;
	case 'show_target_scripts': {
		const target = requireTarget(args, command);
		result = 'exitCode' in target ? target : showTargetScripts(target.target);
		break;
	}
	case 'verify': {
		const targets = requireTargets(args, command);
		result = 'exitCode' in targets ? targets : runVerify(targets.targets);
		break;
	}
	case 'verify_changed':
		result = runVerifyChanged();
		break;
	case 'repair': {
		const targets = requireTargets(args, command);
		result = 'exitCode' in targets ? targets : runRepair(targets.targets);
		break;
	}
	case 'repair_changed':
		result = runRepairChanged();
		break;
	case 'test': {
		const targets = requireTargets(args, command);
		result = 'exitCode' in targets ? targets : runTest(targets.targets);
		break;
	}
	case 'test_changed':
		result = runTestChanged();
		break;
	case 'test_one': {
		if (args.length < 2) {
			result = fail('test_one requires a target and a pattern');
			break;
		}
		const targetArg = args[0]!;
		const target = requireTarget([targetArg], command);
		if ('exitCode' in target) {
			result = target;
			break;
		}
		result = runTestOne(target.target, args.slice(1).join(' '));
		break;
	}
	case 'test_file': {
		if (args.length !== 2) {
			result = fail('test_file requires exactly one target and one filePath');
			break;
		}
		const targetArg = args[0]!;
		const filePath = args[1]!;
		const target = requireTarget([targetArg], command);
		if ('exitCode' in target) {
			result = target;
			break;
		}
		result = runTestFile(target.target, filePath);
		break;
	}
	case 'git_status':
		result = runGit('status');
		break;
	case 'git_diff':
		result = runGit('diff');
		break;
	case 'git_diff_target': {
		const target = requireTarget(args, command);
		result =
			'exitCode' in target
				? target
				: runGitForTarget('diff-target', target.target);
		break;
	}
	case 'git_diff_staged':
		result = runGit('diff-staged');
		break;
	case 'git_diff_stat':
		result = runGit('diff-stat');
		break;
	case 'git_diff_target_stat': {
		const target = requireTarget(args, command);
		result =
			'exitCode' in target
				? target
				: runGitForTarget('diff-target-stat', target.target);
		break;
	}
	case 'git_diff_staged_stat':
		result = runGit('diff-staged-stat');
		break;
	case 'git_changed_files':
		result = runGit('name-only');
		break;
	case 'git_changed_files_staged':
		result = runGit('name-only-staged');
		break;
	default:
		result = help(1);
}

printResult(result);
