import { runNoArgCommand } from '../cli/commandArgs.js';
import type { CommandResult } from '../tools/runScript.js';
import { toCommandResult } from '../tools/runScript.js';
import { listTargetNames } from '../tools/targetRegistry.js';
import type { CommandDefinition } from './types.js';

function listTargets(): CommandResult {
	const targets = listTargetNames();
	return toCommandResult(targets.length > 0 ? targets : ['(no targets found)']);
}

export const listTargetsCommand: CommandDefinition = {
	name: 'list_targets',
	usage: '',
	description: 'list all handlers/*, modules/*, cdk, and buildcheck targets',
	category: 'Utility',
	handler: (args) => runNoArgCommand(args, 'list_targets', listTargets),
};
