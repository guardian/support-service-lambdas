import { parseRequiredTargets } from '../cli/commandArgs.js';
import type { CommandResult, ExecutionOptions } from '../tools/runScript.js';
import {
	runChangedTargetsOrWarn,
	runSingleStep,
	type TargetScriptStep,
} from '../tools/targetScriptRunner.js';
import { isValidTargetFormat } from '../tools/targetValidation.js';
import type { CommandCategory, CommandDefinition } from './types.js';

/**
 * Builds a handler that runs a single pnpm script step across one or more
 * targets (or --changed targets). Step fields default to the command name.
 */
function targetStepHandler(
	name: string,
	stepOverrides?: Partial<TargetScriptStep>,
): (
	args: string[],
	context: { execOptions: ExecutionOptions },
) => Promise<CommandResult> {
	const step: TargetScriptStep = {
		script: name,
		label: name,
		summaryLabel: name,
		...stepOverrides,
	};
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

/**
 * Splits args into target-shaped args (passed to parseRequiredTargets) and
 * any remaining words (joined as an optional pattern for the pnpm script).
 */
function extractPattern(args: string[]): {
	targetArgs: string[];
	pattern: string | undefined;
} {
	const targetArgs: string[] = [];
	const patternParts: string[] = [];
	for (const arg of args) {
		if (
			arg === '--changed' ||
			arg.startsWith('--') ||
			isValidTargetFormat(arg)
		) {
			targetArgs.push(arg);
		} else {
			patternParts.push(arg);
		}
	}
	return {
		targetArgs,
		pattern: patternParts.length > 0 ? patternParts.join(' ') : undefined,
	};
}

/**
 * Builds a complete CommandDefinition for commands that run a single pnpm
 * script step across targets or --changed targets.
 * The step script/label/summaryLabel default to the command name so
 * the name appears exactly once in each command file.
 */
export function targetStepCommand(
	name: string,
	category: CommandCategory,
	stepOverrides?: Partial<TargetScriptStep>,
): CommandDefinition {
	return {
		name,
		usage: '<target...> | --changed',
		description: `run ${name}`,
		category,
		handler: targetStepHandler(name, stepOverrides),
	};
}

/**
 * Like targetStepCommand but accepts an optional trailing pattern argument
 * that is passed directly to the pnpm script (e.g. a jest path pattern).
 * Targets are identified by format; anything else is treated as the pattern.
 */
export function targetStepCommandWithPattern(
	name: string,
	category: CommandCategory,
): CommandDefinition {
	return {
		name,
		usage: '<target...> | --changed [pattern]',
		description: `run ${name}, optionally filtered by path pattern`,
		category,
		handler: async (args, context) => {
			const { targetArgs, pattern } = extractPattern(args);
			const parsed = parseRequiredTargets(targetArgs, name);
			if ('exitCode' in parsed) {
				return parsed;
			}
			const step: TargetScriptStep = {
				script: name,
				label: pattern !== undefined ? `${name} ${pattern}` : name,
				summaryLabel: name,
				...(pattern !== undefined ? { extraArgs: [pattern] } : {}),
			};
			const run = (targets: string[]) =>
				runSingleStep(targets, step, context.execOptions);
			if (parsed.changed) {
				return await runChangedTargetsOrWarn(run);
			}
			return await run(parsed.targets);
		},
	};
}
