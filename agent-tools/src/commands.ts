import { existsSync } from 'fs';
import { resolve as fsResolve } from 'path';
import { listPackages, resolveChangedPackages } from './changed.js';
import {
	type CommandResult,
	type ExecutionOptions,
	hasScript,
	printProgress,
	ROOT,
	runRootCommand,
	runScript,
	toCommandResult,
} from './run.js';

export type Handler = (
	args: string[],
	execOptions: ExecutionOptions,
) => Promise<CommandResult>;

export type Command = { usage: string; description: string; handler: Handler };

export const COMMANDS: Record<string, Command> = {
	'list-packages': {
		usage: '',
		description: 'list all handlers/*, modules/*, cdk, and buildcheck packages',
		handler: () => Promise.resolve(toCommandResult(listPackages())),
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
	'git-changed-files': rootCmd('git --no-pager diff --name-only'),
	'git-changed-files-staged': rootCmd(
		'git --no-pager diff --staged --name-only',
	),
	'git-diff-target': pathCmd('git --no-pager diff --minimal'),
	'git-diff-target-stat': pathCmd('git --no-pager diff --stat'),
};

// Help is added last so its handler can reference the completed COMMANDS table
COMMANDS['help'] = {
	usage: '',
	description: 'show this help',
	handler: () => {
		const lines = [
			'Usage:',
			'  ./agent-tool <command> [args...] [--tail N] [--grep PATTERN]',
			'',
			'Commands:',
			...Object.entries(COMMANDS).map(([name, cmd]) => {
				const usage = cmd.usage.length > 0 ? ` ${cmd.usage}` : '';
				return `  ${name}${usage} - ${cmd.description}`;
			}),
			'',
			'Global options:',
			'  --tail N        include N trailing lines for failures and stream full output to a temp log file',
			'  --grep PATTERN  only stream subcommand output lines that match the regex pattern',
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
): CommandResult | { packages: string[] } {
	if (args.includes('--changed')) {
		const packages = resolveChangedPackages();
		if (packages.length === 0) {
			return toCommandResult([
				'WARN no changed handlers/*, modules/*, cdk, or buildcheck packages detected',
			]);
		}
		return { packages };
	}
	const packages = args.filter((a) => !a.startsWith('--'));
	if (packages.length === 0) {
		return toCommandResult(
			[`FAIL ${commandName} requires at least one package or --changed`],
			1,
		);
	}
	for (const pkg of packages) {
		if (!existsSync(fsResolve(ROOT, pkg))) {
			return toCommandResult([`FAIL ${pkg}: package does not exist`], 1);
		}
	}
	return { packages };
}

async function runForPackages(
	args: string[],
	commandName: string,
	script: string,
	extraArgs: string[],
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	const resolved = resolvePackages(args, commandName);
	if ('exitCode' in resolved) {
		return resolved;
	}
	const label = [script, ...extraArgs].join(' ');
	const lines: string[] = [];
	let failCount = 0;

	for (const pkg of resolved.packages) {
		printProgress(`PACKAGE ${pkg}`);
		if (!hasScript(pkg, script)) {
			const warn = `WARN ${pkg} ${script}: skipped (not in package.json)`;
			printProgress(warn);
			lines.push(warn);
			continue;
		}
		printProgress(`RUN  ${pkg} ${label}`);
		const result = await runScript(pkg, script, { extraArgs, execOptions });
		const s = Math.round(result.durationMs / 1000);
		if (result.passed) {
			printProgress(`OK   ${pkg} ${label} (${s}s)`);
		} else {
			const fail = `FAIL ${pkg} ${label} (${s}s)`;
			printProgress(fail);
			lines.push(fail);
			if (result.excerpt) {
				lines.push(result.excerpt);
			}
			failCount++;
		}
	}

	lines.push(
		failCount === 0
			? `OK   ${commandName} complete`
			: `FAIL ${failCount} ${commandName} failure(s)`,
	);
	return toCommandResult(lines, failCount === 0 ? 0 : 1);
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
				if (
					arg === '--changed' ||
					arg.startsWith('--') ||
					existsSync(fsResolve(ROOT, arg))
				) {
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
			const result = await runRootCommand(executable!, cmdArgs, execOptions);
			const s = Math.round(result.durationMs / 1000);
			if (result.passed) {
				return toCommandResult([`OK   ${commandString} (${s}s)`]);
			}
			const lines = [`FAIL ${commandString} (${s}s)`];
			if (result.excerpt) {
				lines.push(result.excerpt);
			}
			return toCommandResult(lines, result.exitCode);
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
			if (!existsSync(fsResolve(ROOT, pkg))) {
				return toCommandResult([`FAIL ${pkg}: package does not exist`], 1);
			}
			printProgress(`RUN  ${commandString} -- ${pkg}`);
			const result = await runRootCommand(
				executable!,
				[...cmdArgs, '--', pkg],
				execOptions,
			);
			const s = Math.round(result.durationMs / 1000);
			if (result.passed) {
				return toCommandResult([`OK   ${commandString} (${s}s)`]);
			}
			const lines = [`FAIL ${commandString} (${s}s)`];
			if (result.excerpt) {
				lines.push(result.excerpt);
			}
			return toCommandResult(lines, result.exitCode);
		},
	};
}
