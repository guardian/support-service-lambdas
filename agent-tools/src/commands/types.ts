import type { CommandResult, ExecutionOptions } from '../tools/runScript.js';

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
	handler: CommandHandler;
};
