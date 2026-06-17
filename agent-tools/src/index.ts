import { runGit, runGitForTarget } from './tools/git.js';
import {
	runFixFormatting,
	runFixFormattingChanged,
	runLintFix,
	runLintFixChanged,
} from './tools/repair.js';
import {
	closeExecutionOptions,
	createExecutionOptions,
	toCommandResult,
} from './tools/runScript.js';
import type { CommandResult } from './tools/runScript.js';
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
import {
	runCheckFormatting,
	runCheckFormattingChanged,
	runLint,
	runLintChanged,
	runTypeCheck,
	runTypeCheckChanged,
	runVerify,
	runVerifyChanged,
} from './tools/verify.js';
import { runInstallWorkspace, runSnapshotUpdate } from './tools/workspace.js';

const HELP_LINES = [
	'Usage:',
	'  ./agent-tool <command> [args...] [--tail N]',
	'',
	'Commands:',
	'  help',
	'  list_targets',
	'  validate_targets <target...>',
	'  show_target_scripts <target>',
	'  verify <target...>',
	'  verify_changed',
	'  check_formatting <target...>',
	'  check_formatting_changed',
	'  lint <target...>',
	'  lint_changed',
	'  type_check <target...>',
	'  type_check_changed',
	'  fix_formatting <target...>',
	'  fix_formatting_changed',
	'  lint_fix <target...>',
	'  lint_fix_changed',
	'  test <target...>',
	'  test_changed',
	'  test_one <target> <pattern>',
	'  test_file <target> <filePath>',
	'  snapshot_update',
	'  install_workspace [--no-frozen]',
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
	'Global options:',
	'  --tail N        include N trailing lines for failures and stream full output to a temp log file',
	'',
	'Notes:',
	'  - Full child command output streams by default.',
	'  - Targets must be under handlers/* or modules/*.',
	'  - Use the absolute wrapper path if your Copilot approvals are path-specific.',
	'  - install_workspace is mutating; default mode is --frozen-lockfile.',
];

const TARGET_RE = /^(handlers|modules)\/[a-zA-Z0-9._-]+$/;

type ParsedGlobalOptions = {
	positionals: string[];
	tailLines: number | null;
};

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
	if (result.output.length > 0) {
		process.stdout.write(`${result.output}\n`);
	}
	process.exit(result.exitCode);
}

function parseGlobalOptions(
	args: string[],
): ParsedGlobalOptions | CommandResult {
	const positionals: string[] = [];
	let tailLines: number | null = null;

	for (let i = 0; i < args.length; i += 1) {
		const arg = args[i]!;
		if (arg === '--verbose') {
			return fail('--verbose is now default; remove the flag');
		}
		if (arg === '--tail') {
			const raw = args[i + 1];
			if (!raw) {
				return fail('--tail requires a numeric value');
			}
			const parsed = Number.parseInt(raw, 10);
			if (!Number.isFinite(parsed) || parsed <= 0) {
				return fail(`invalid --tail value: ${raw}`);
			}
			tailLines = parsed;
			i += 1;
			continue;
		}
		if (arg.startsWith('--tail=')) {
			const raw = arg.slice('--tail='.length);
			const parsed = Number.parseInt(raw, 10);
			if (!Number.isFinite(parsed) || parsed <= 0) {
				return fail(`invalid --tail value: ${raw}`);
			}
			tailLines = parsed;
			continue;
		}
		positionals.push(arg);
	}

	return { positionals, tailLines };
}

function parseInstallOptions(
	args: string[],
): CommandResult | { frozen: boolean } {
	if (args.length === 0) {
		return { frozen: true };
	}
	if (args.length === 1 && args[0] === '--no-frozen') {
		return { frozen: false };
	}
	return fail('install_workspace supports only optional --no-frozen');
}

async function main(): Promise<void> {
	const cliArgs = process.argv.slice(2);
	const normalizedArgs = cliArgs[0] === '--' ? cliArgs.slice(1) : cliArgs;
	const parsed = parseGlobalOptions(normalizedArgs);
	if ('exitCode' in parsed) {
		printResult(parsed);
	}
	const [rawCommand, ...args] = parsed.positionals;

	if (
		!rawCommand ||
		rawCommand === 'help' ||
		rawCommand === '--help' ||
		rawCommand === '-h'
	) {
		printResult(help());
	}

	const command = rawCommand;
	const execOptions = createExecutionOptions({
		verbose: true,
		tailLines: parsed.tailLines,
	});
	if (execOptions.logFilePath) {
		process.stdout.write(`INFO full output log: ${execOptions.logFilePath}\n`);
	}

	let result: CommandResult;
	try {
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
				result =
					'exitCode' in target ? target : showTargetScripts(target.target);
				break;
			}
			case 'verify': {
				const targets = requireTargets(args, command);
				result =
					'exitCode' in targets
						? targets
						: await runVerify(targets.targets, execOptions);
				break;
			}
			case 'verify_changed':
				result = await runVerifyChanged(execOptions);
				break;
			case 'check_formatting': {
				const targets = requireTargets(args, command);
				result =
					'exitCode' in targets
						? targets
						: await runCheckFormatting(targets.targets, execOptions);
				break;
			}
			case 'check_formatting_changed':
				result = await runCheckFormattingChanged(execOptions);
				break;
			case 'lint': {
				const targets = requireTargets(args, command);
				result =
					'exitCode' in targets
						? targets
						: await runLint(targets.targets, execOptions);
				break;
			}
			case 'lint_changed':
				result = await runLintChanged(execOptions);
				break;
			case 'type_check': {
				const targets = requireTargets(args, command);
				result =
					'exitCode' in targets
						? targets
						: await runTypeCheck(targets.targets, execOptions);
				break;
			}
			case 'type_check_changed':
				result = await runTypeCheckChanged(execOptions);
				break;
			case 'fix_formatting': {
				const targets = requireTargets(args, command);
				result =
					'exitCode' in targets
						? targets
						: await runFixFormatting(targets.targets, execOptions);
				break;
			}
			case 'fix_formatting_changed':
				result = await runFixFormattingChanged(execOptions);
				break;
			case 'lint_fix': {
				const targets = requireTargets(args, command);
				result =
					'exitCode' in targets
						? targets
						: await runLintFix(targets.targets, execOptions);
				break;
			}
			case 'lint_fix_changed':
				result = await runLintFixChanged(execOptions);
				break;
			case 'test': {
				const targets = requireTargets(args, command);
				result =
					'exitCode' in targets
						? targets
						: await runTest(targets.targets, execOptions);
				break;
			}
			case 'test_changed':
				result = await runTestChanged(execOptions);
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
				result = await runTestOne(
					target.target,
					args.slice(1).join(' '),
					execOptions,
				);
				break;
			}
			case 'test_file': {
				if (args.length !== 2) {
					result = fail(
						'test_file requires exactly one target and one filePath',
					);
					break;
				}
				const targetArg = args[0]!;
				const filePath = args[1]!;
				const target = requireTarget([targetArg], command);
				if ('exitCode' in target) {
					result = target;
					break;
				}
				result = await runTestFile(target.target, filePath, execOptions);
				break;
			}
			case 'snapshot_update':
				result = await runSnapshotUpdate(execOptions);
				break;
			case 'install_workspace': {
				const install = parseInstallOptions(args);
				result =
					'exitCode' in install
						? install
						: await runInstallWorkspace(execOptions, install);
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
	} finally {
		closeExecutionOptions(execOptions);
	}

	printResult(result);
}

await main();
