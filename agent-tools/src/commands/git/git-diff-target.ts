import { rootTargetCommand } from '../rootCommand.js';

export default rootTargetCommand(
	'git-diff-target',
	'Git',
	'git --no-pager diff --minimal',
);
