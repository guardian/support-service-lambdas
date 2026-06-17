import { runNoArgCommand } from '../cli/commandArgs.js';
import { runSnapshotUpdate } from '../tools/workspace.js';
import type { CommandDefinition } from './types.js';

export const snapshotUpdateCommand: CommandDefinition = {
	name: 'snapshot_update',
	usage: '',
	description: 'run pnpm snapshot:update at repo root',
	category: 'Workspace',
	handler: (args, context) =>
		runNoArgCommand(args, 'snapshot_update', () =>
			runSnapshotUpdate(context.execOptions),
		),
};
