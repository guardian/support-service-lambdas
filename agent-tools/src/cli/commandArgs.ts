import type { CommandResult, ExecutionOptions } from '../tools/runScript.js';
import { toCommandResult } from '../tools/runScript.js';
import { listTargetNames } from '../tools/targetRegistry.js';
import {
	runChangedTargetsOrWarn,
	runSingleStep,
	type TargetScriptStep,
} from '../tools/targetScriptRunner.js';
import { validateTargetAgainstKnownTargets } from '../tools/targetValidation.js';

// --- Target arg parsing (inlined from targetArgs.ts) ---

type TargetValidationError = {
	target: string;
	reason: string;
};

type ParsedTargetCommandArgs = {
	changed: boolean;
	targets: string[];
	unsupportedOptions: string[];
};

function validateTargetArgs(
	targets: string[],
	knownTargets: ReadonlySet<string>,
): TargetValidationError[] {
	return targets.flatMap((target) => {
		const reason = validateTargetAgainstKnownTargets(target, knownTargets);
		return reason === null ? [] : [{ target, reason }];
	});
}

function parseTargetCommandArgs(args: string[]): ParsedTargetCommandArgs {
	const targets: string[] = [];
	const unsupportedOptions: string[] = [];
	let changed = false;

	for (const arg of args) {
		if (arg === '--changed') {
			changed = true;
			continue;
		}
		if (arg.startsWith('--')) {
			unsupportedOptions.push(arg);
			continue;
		}
		targets.push(arg);
	}

	return { changed, targets, unsupportedOptions };
}

// --- Shared arg helpers ---

export function fail(message: string): CommandResult {
	return toCommandResult([`FAIL ${message}`], 1);
}

function requireTargets(
	args: string[],
	command: string,
): CommandResult | { targets: string[] } {
	if (args.length === 0) {
		return fail(`${command} requires at least one target`);
	}
	const invalid = validateTargetArgs(args, new Set(listTargetNames()));
	if (invalid.length > 0) {
		return toCommandResult(
			invalid.map((result) => `FAIL ${result.target}: ${result.reason}`),
			1,
		);
	}
	return { targets: args };
}

export function requireSingleTarget(
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

export function parseRequiredTargets(
	args: string[],
	command: string,
): CommandResult | { changed: boolean; targets: string[] } {
	const parsed = parseTargetCommandArgs(args);
	if (parsed.unsupportedOptions.length > 0) {
		return fail(
			`${command} does not support option ${parsed.unsupportedOptions[0]}`,
		);
	}
	if (parsed.changed) {
		if (parsed.targets.length > 0) {
			return fail(`${command} does not accept targets when --changed is set`);
		}
		return { changed: true, targets: [] };
	}
	const required = requireTargets(parsed.targets, command);
	if ('exitCode' in required) {
		return required;
	}
	return { changed: false, targets: required.targets };
}

export async function runNoArgCommand(
	args: string[],
	command: string,
	run: () => Promise<CommandResult> | CommandResult,
): Promise<CommandResult> {
	if (args.length > 0) {
		return fail(`${command} does not accept any arguments`);
	}
	return await run();
}

export async function runSingleTargetCommand(
	args: string[],
	command: string,
	run: (target: string) => Promise<CommandResult> | CommandResult,
): Promise<CommandResult> {
	const target = requireSingleTarget(args, command);
	if ('exitCode' in target) {
		return target;
	}
	return await run(target.target);
}

/**
 * Creates a handler for commands that run a single pnpm script step across
 * one or more targets (or --changed targets). Covers all verify/repair commands.
 */
export function targetStepHandler(
	name: string,
	step: TargetScriptStep,
): (
	args: string[],
	context: { execOptions: ExecutionOptions },
) => Promise<CommandResult> {
	return async (args, context) => {
		const parsed = parseRequiredTargets(args, name);
		if ('exitCode' in parsed) {
			return parsed;
		}
		const run = (targets: string[]) =>
			runSingleStep(targets, step, context.execOptions);
		if (parsed.changed) {
			return await runChangedTargetsOrWarn(run);
		}
		return await run(parsed.targets);
	};
}
