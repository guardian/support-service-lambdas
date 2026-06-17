import { runNoArgCommand } from '../cli/commandArgs.js';
import { listTargets } from '../tools/targets.js';
import type { CommandDefinition } from './types.js';

export const listTargetsCommand: CommandDefinition = {
	name: 'list_targets',
	usage: '',
	description: 'list all handlers/*, modules/*, cdk, and buildcheck targets',
	category: 'Utility',
	handler: (args) => runNoArgCommand(args, 'list_targets', listTargets),
};
