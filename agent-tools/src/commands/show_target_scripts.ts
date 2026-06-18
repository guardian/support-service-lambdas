import { runSingleTargetCommand } from '../cli/commandArgs.js';
import type { CommandResult } from '../tools/runScript.js';
import {
	getScripts,
	targetExists,
	toCommandResult,
} from '../tools/runScript.js';
import type { CommandDefinition } from './types.js';

function showTargetScripts(target: string): CommandResult {
	if (!targetExists(target)) {
		return toCommandResult([`FAIL ${target}: target does not exist`], 1);
	}
	const scripts = getScripts(target);
	if (scripts.length === 0) {
		return toCommandResult([`WARN ${target}: no scripts found`]);
	}
	return toCommandResult([`Scripts for ${target}:`, '', ...scripts]);
}

export const showTargetScriptsCommand: CommandDefinition = {
	name: 'show_target_scripts',
	usage: '<target>',
	description: 'show scripts from a target package.json',
	category: 'Utility',
	handler: (args) =>
		runSingleTargetCommand(args, 'show_target_scripts', showTargetScripts),
};
