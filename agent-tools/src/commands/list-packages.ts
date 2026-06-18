import { runNoArgCommand } from '../cli/commandArgs.js';
import { listPackages } from '../tools/packageRegistry.js';
import type { CommandResult } from '../tools/runScript.js';
import { toCommandResult } from '../tools/runScript.js';
import type { CommandDefinition } from './types.js';

function listPackagesResult(): CommandResult {
	const packages = listPackages();
	return toCommandResult(
		packages.length > 0 ? packages : ['(no packages found)'],
	);
}

export default {
	name: 'list-packages',
	usage: '',
	description: 'list all handlers/*, modules/*, cdk, and buildcheck packages',
	category: 'Utility',
	handler: (args) => runNoArgCommand(args, 'list-packages', listPackagesResult),
} satisfies CommandDefinition;
