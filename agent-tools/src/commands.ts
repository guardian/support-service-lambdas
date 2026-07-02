import { existsSync, readFileSync } from 'fs';
import { listPackages, resolveChangedPackages } from './changed.js';
import {
	buildPnpmArgs,
	type CommandResult,
	DEFAULT_MAX_OUTPUT_LINES,
	type ExecutionOptions,
	formatTruncationNotice,
	getLastLogPath,
	postProcessOutput,
	printProgress,
	resolveRepoPath,
	run,
	type ScriptResult,
	toCommandResult,
} from './run.js';

export type Handler = (
	args: string[],
	execOptions: ExecutionOptions,
) => Promise<CommandResult>;

export type Command = { usage: string; description: string; handler: Handler };

// Matches valid package paths without hitting the filesystem
const PKG_RE = /^(handlers|modules)\/\S+$|^(cdk|buildcheck|agent-tools)$/;

function formatResult(name: string, result: ScriptResult): CommandResult {
	const s = Math.round(result.durationMs / 1000);
	if (result.passed) {
		return toCommandResult([`OK   ${name} (${s}s)`]);
	}
	const lines = [`FAIL ${name} (${s}s)`];
	if (result.excerpt) {
		lines.push(result.excerpt);
	}
	const notice = formatTruncationNotice(result);
	if (notice) {
		lines.push(notice);
	}
	return toCommandResult(lines, result.exitCode);
}

export const COMMANDS: Record<string, Command> = {
	'list-packages': {
		usage: '',
		description: 'list all handlers/*, modules/*, cdk, and buildcheck packages',
		handler: (_, execOptions) =>
			Promise.resolve(toCommandResult(listPackages(execOptions.root))),
	},
	'check-formatting': pkgScript('check-formatting'),
	lint: pkgScript('lint'),
	'type-check': pkgScript('type-check'),
	'fix-formatting': pkgScript('fix-formatting'),
	'lint-fix': pkgScript('lint-fix', 'lint --fix'),
	test: pkgScriptWithPattern('test'),
	'snapshot-update': rootCmd('pnpm snapshot:update'),
	install: rootCmd('pnpm install'),
	'git-status': rootCmd('git --no-pager status --short'),
	'git-diff': rootCmd('git --no-pager diff --minimal'),
	'git-diff-staged': rootCmd('git --no-pager diff --staged --minimal'),
	'git-diff-stat': rootCmd('git --no-pager diff --stat'),
	'git-diff-staged-stat': rootCmd('git --no-pager diff --staged --stat'),
	'git-diff-target': pathCmd('git --no-pager diff --minimal'),
	'git-diff-target-stat': pathCmd('git --no-pager diff --stat'),
	'git-rm': {
		usage: '<file>',
		description:
			'remove a tracked file from the repo and stage the deletion (path must be inside the repo)',
		handler: async (args, execOptions) => {
			if (args.length !== 1) {
				return toCommandResult(
					[`FAIL git-rm requires exactly one file path`],
					1,
				);
			}
			const repoPath = resolveRepoPath(execOptions.root, args[0]!);
			if (repoPath === null) {
				return toCommandResult(
					[`FAIL path is outside the repository: ${args[0]}`],
					1,
				);
			}
			printProgress(`RUN  git rm ${repoPath}`);
			return formatResult(
				'git-rm',
				await run('git', ['rm', repoPath], execOptions),
			);
		},
	},
	'git-mv': {
		usage: '<source> <destination>',
		description:
			'rename or move a tracked file within the repo (both paths must be inside the repo)',
		handler: async (args, execOptions) => {
			if (args.length !== 2) {
				return toCommandResult(
					[
						`FAIL git-mv requires exactly two file paths: <source> <destination>`,
					],
					1,
				);
			}
			const srcPath = resolveRepoPath(execOptions.root, args[0]!);
			if (srcPath === null) {
				return toCommandResult(
					[`FAIL source path is outside the repository: ${args[0]}`],
					1,
				);
			}
			const destPath = resolveRepoPath(execOptions.root, args[1]!);
			if (destPath === null) {
				return toCommandResult(
					[`FAIL destination path is outside the repository: ${args[1]}`],
					1,
				);
			}
			printProgress(`RUN  git mv ${srcPath} ${destPath}`);
			return formatResult(
				'git-mv',
				await run('git', ['mv', srcPath, destPath], execOptions),
			);
		},
	},
	last: {
		usage: '',
		description:
			"show this repository's most recently recorded full command output, re-filtered by --tail/--grep/--context/--all",
		handler: (_, execOptions) => {
			const logPath = getLastLogPath(execOptions.root);
			if (!existsSync(logPath)) {
				return Promise.resolve(
					toCommandResult(
						['FAIL no previous command output recorded for this repository'],
						1,
					),
				);
			}
			const output = readFileSync(logPath, 'utf-8');
			const result = postProcessOutput(output, {
				tailLines: execOptions.tailLines,
				grepRegex: execOptions.grepRegex,
				contextLines: execOptions.contextLines,
				all: execOptions.all,
				defaultCap: DEFAULT_MAX_OUTPUT_LINES,
			});
			const lines = result.excerpt ? [result.excerpt] : ['(no output)'];
			const notice = formatTruncationNotice(result, 'last');
			if (notice) {
				lines.push(notice);
			}
			return Promise.resolve(toCommandResult(lines));
		},
	},
};

// Help is added last so its handler can reference the completed COMMANDS table
COMMANDS['help'] = {
	usage: '',
	description: 'show this help',
	handler: () => {
		const lines = [
			'Usage:',
			'  ./agent-tool <command> [args...] [--tail N] [--grep PATTERN] [--context N] [--all]',
			'',
			'Commands:',
			...Object.entries(COMMANDS).map(([name, cmd]) => {
				const usage = cmd.usage.length > 0 ? ` ${cmd.usage}` : '';
				return `  ${name}${usage} - ${cmd.description}`;
			}),
			'',
			'Global options:',
			'  --tail N        include N trailing lines for failures (bypasses the default cap; overridden by --all)',
			'  --grep PATTERN  only show subcommand output lines that match the regex pattern',
			'  --context N     include N lines of context around each --grep match (requires --grep)',
			'  --all           show the full output, bypassing --tail/the default cap entirely',
			'',
			'Notes:',
			'  - Full child command output streams by default.',
			'  - Packages must be handlers/<name>, modules/<name>, cdk, or buildcheck.',
			'  - Use the absolute wrapper path if your Copilot approvals are path-specific.',
		];
		return Promise.resolve(toCommandResult(lines));
	},
};

function resolvePackages(
	args: string[],
	commandName: string,
	root: string,
): CommandResult | { packages: string[]; changed: boolean } {
	if (args.includes('--changed')) {
		const packages = resolveChangedPackages(root);
		if (packages.length === 0) {
			return toCommandResult([
				'WARN no changed handlers/*, modules/*, cdk, or buildcheck packages detected',
			]);
		}
		return { packages, changed: true };
	}
	const packages = args.filter((a) => !a.startsWith('--'));
	if (packages.length === 0) {
		return toCommandResult(
			[
				`FAIL ${commandName} requires at least one package or --changed`,
				`  Packages must be workspace paths e.g. handlers/product-switch-api or modules/aws`,
			],
			1,
		);
	}
	return { packages, changed: false };
}

async function runForPackages(
	args: string[],
	commandName: string,
	script: string,
	extraArgs: string[],
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	const resolved = resolvePackages(args, commandName, execOptions.root);
	if ('exitCode' in resolved) {
		return resolved;
	}

	const pnpmFilterArgs = buildPnpmArgs(
		resolved.packages,
		script,
		extraArgs,
		resolved.changed,
	);
	const scope = resolved.changed
		? `--changed (+ dependents)`
		: resolved.packages.join(', ');

	printProgress(`RUN  ${commandName} ${scope}`);
	return formatResult(
		commandName,
		await run('pnpm', pnpmFilterArgs, execOptions),
	);
}

/** pnpm script run across packages. scriptAndArgs e.g. 'lint --fix'. */
function pkgScript(commandName: string, scriptAndArgs?: string): Command {
	const [script, ...extraArgs] = (scriptAndArgs ?? commandName).split(' ');
	return {
		usage: '<package...> | --changed',
		description: `run ${scriptAndArgs ?? commandName}`,
		handler: (args, execOptions) =>
			runForPackages(args, commandName, script!, extraArgs, execOptions),
	};
}

/** Like pkgScript but accepts an optional trailing non-package pattern forwarded to the script. */
function pkgScriptWithPattern(commandName: string): Command {
	return {
		usage: '<package...> | --changed [pattern]',
		description: `run ${commandName}, optionally filtered by path pattern`,
		handler: async (args, execOptions) => {
			const packageArgs: string[] = [];
			const patternParts: string[] = [];
			for (const arg of args) {
				if (arg === '--changed' || arg.startsWith('--') || PKG_RE.test(arg)) {
					packageArgs.push(arg);
				} else {
					patternParts.push(arg);
				}
			}
			const extraArgs = patternParts.length > 0 ? [patternParts.join(' ')] : [];
			return runForPackages(
				packageArgs,
				commandName,
				commandName,
				extraArgs,
				execOptions,
			);
		},
	};
}

/** Run a single root-level command (git or pnpm) with no arguments. */
function rootCmd(commandString: string): Command {
	const [executable, ...cmdArgs] = commandString.split(' ');
	return {
		usage: '',
		description: commandString,
		handler: async (args, execOptions) => {
			if (args.length > 0) {
				return toCommandResult([`FAIL this command takes no arguments`], 1);
			}
			printProgress(`RUN  ${commandString}`);
			return formatResult(
				commandString,
				await run(executable!, cmdArgs, execOptions),
			);
		},
	};
}

/** Run a root-level git command scoped to a single package path (appended after --). */
function pathCmd(commandString: string): Command {
	const [executable, ...cmdArgs] = commandString.split(' ');
	return {
		usage: '<package>',
		description: `${commandString} for one package`,
		handler: async (args, execOptions) => {
			if (args.length !== 1) {
				return toCommandResult(
					[`FAIL requires exactly one package argument`],
					1,
				);
			}
			const pkg = args[0]!;
			printProgress(`RUN  ${commandString} -- ${pkg}`);
			return formatResult(
				commandString,
				await run(executable!, [...cmdArgs, '--', pkg], execOptions),
			);
		},
	};
}
