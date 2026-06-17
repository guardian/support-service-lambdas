import type { CommandResult, ExecutionOptions } from '../tools/runScript.js';

export type CommandCategory =
	| 'Utility'
	| 'Verification'
	| 'Fix'
	| 'Test'
	| 'Workspace'
	| 'Git';

export type CommandContext = {
	execOptions: ExecutionOptions;
};

export type CommandHandler = (
	args: string[],
	context: CommandContext,
) => Promise<CommandResult>;

export type CommandDefinition = {
	name: string;
	usage: string;
	description: string;
	category: CommandCategory;
	safetyNote?: string;
	handler: CommandHandler;
};
