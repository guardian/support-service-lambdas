import { parseRequiredPackages } from '../cli/commandArgs.js';
import {
	type PackageScriptStep,
	runChangedPackagesOrWarn,
	runPackageScript,
} from '../tools/packageScriptRunner.js';
import { isValidPackageFormat } from '../tools/packageValidation.js';
import type { CommandResult, ExecutionOptions } from '../tools/runScript.js';
import type { CommandCategory, CommandDefinition } from './types.js';

/** Parses 'script arg1 arg2' into { script, extraArgs }. Defaults to name when omitted. */
function parseScriptAndArgs(
	name: string,
	scriptAndArgs?: string,
): { script: string; extraArgs: string[] } {
	if (!scriptAndArgs) {
		return { script: name, extraArgs: [] };
	}
	const [script, ...rest] = scriptAndArgs.split(' ');
	return { script: script!, extraArgs: rest };
}

function packageScriptHandler(
	name: string,
	scriptAndArgs?: string,
): (
	args: string[],
	context: { execOptions: ExecutionOptions },
) => Promise<CommandResult> {
	const { script, extraArgs } = parseScriptAndArgs(name, scriptAndArgs);
	const step: PackageScriptStep = {
		script,
		...(extraArgs.length > 0 ? { extraArgs } : {}),
	};
	return async (args, context) => {
		const parsed = parseRequiredPackages(args, name);
		if ('exitCode' in parsed) {
			return parsed;
		}
		const run = (packages: string[]) =>
			runPackageScript(packages, step, name, context.execOptions);
		if (parsed.changed) {
			return await runChangedPackagesOrWarn(run);
		}
		return await run(parsed.packages);
	};
}

/**
 * Splits args into package-shaped args (passed to parseRequiredPackages) and
 * any remaining words (joined as an optional pattern for the pnpm script).
 */
function extractPattern(args: string[]): {
	packageArgs: string[];
	pattern: string | undefined;
} {
	const packageArgs: string[] = [];
	const patternParts: string[] = [];
	for (const arg of args) {
		if (
			arg === '--changed' ||
			arg.startsWith('--') ||
			isValidPackageFormat(arg)
		) {
			packageArgs.push(arg);
		} else {
			patternParts.push(arg);
		}
	}
	return {
		packageArgs,
		pattern: patternParts.length > 0 ? patternParts.join(' ') : undefined,
	};
}

/**
 * Builds a CommandDefinition for running a pnpm script across one or more
 * packages (or --changed packages).
 * scriptAndArgs defaults to the command name (e.g. 'lint --fix' overrides the script).
 */
export function packageScript(
	name: string,
	category: CommandCategory,
	scriptAndArgs?: string,
): CommandDefinition {
	return {
		name,
		usage: '<package...> | --changed',
		description: `run ${scriptAndArgs ?? name}`,
		category,
		handler: packageScriptHandler(name, scriptAndArgs),
	};
}

/**
 * Like packageScript but accepts an optional trailing pattern argument
 * passed directly to the pnpm script (e.g. a jest path pattern).
 * Package args are identified by format; anything else is the pattern.
 */
export function packageScriptWithPattern(
	name: string,
	category: CommandCategory,
): CommandDefinition {
	return {
		name,
		usage: '<package...> | --changed [pattern]',
		description: `run ${name}, optionally filtered by path pattern`,
		category,
		handler: async (args, context) => {
			const { packageArgs, pattern } = extractPattern(args);
			const parsed = parseRequiredPackages(packageArgs, name);
			if ('exitCode' in parsed) {
				return parsed;
			}
			const step: PackageScriptStep = {
				script: name,
				...(pattern !== undefined ? { extraArgs: [pattern] } : {}),
			};
			const run = (packages: string[]) =>
				runPackageScript(packages, step, name, context.execOptions);
			if (parsed.changed) {
				return await runChangedPackagesOrWarn(run);
			}
			return await run(parsed.packages);
		},
	};
}
