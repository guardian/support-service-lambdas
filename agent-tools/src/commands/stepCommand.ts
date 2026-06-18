import { targetStepHandler } from '../cli/commandArgs.js';
import type { TargetScriptStep } from '../tools/targetScriptRunner.js';
import type { CommandCategory, CommandDefinition } from './types.js';
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
