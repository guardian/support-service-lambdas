import { runSingleTargetCommand } from '../cli/commandArgs.js';
import { showTargetScripts } from '../tools/targets.js';
import type { CommandDefinition } from './types.js';

export const showTargetScriptsCommand: CommandDefinition = {
	name: 'show_target_scripts',
	usage: '<target>',
	description: 'show scripts from a target package.json',
	category: 'Utility',
	handler: (args) =>
		runSingleTargetCommand(args, 'show_target_scripts', showTargetScripts),
};
