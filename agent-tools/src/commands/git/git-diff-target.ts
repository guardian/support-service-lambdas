import { rootPathCommand } from '../rootCommand.js';

export default rootPathCommand(
	'git-diff-target',
	'git --no-pager diff --minimal',
);
