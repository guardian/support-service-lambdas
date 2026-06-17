import { fail } from '../cli/commandArgs.js';
import type { CommandResult } from '../tools/runScript.js';
import { runInstallWorkspace } from '../tools/workspace.js';
import type { CommandDefinition } from './types.js';

function parseInstallOptions(
	args: string[],
): CommandResult | { frozen: boolean } {
	if (args.length === 0) {
		return { frozen: true };
	}
	if (args.length === 1 && args[0] === '--no-frozen') {
		return { frozen: false };
	}
	return fail('install_workspace accepts only optional --no-frozen');
}

export const installWorkspaceCommand: CommandDefinition = {
	name: 'install_workspace',
	usage: '[--no-frozen]',
	description: 'run pnpm install (default --frozen-lockfile)',
	category: 'Workspace',
	safetyNote:
		'install_workspace is mutating; default mode is --frozen-lockfile',
	handler: async (args, context) => {
		const options = parseInstallOptions(args);
		if ('exitCode' in options) {
			return options;
		}
		return await runInstallWorkspace(context.execOptions, options);
	},
};
