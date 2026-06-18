import { rootPathCommand } from '../rootCommand.js';

export default rootPathCommand(
	'git-diff-target',
	'Git',
	'git --no-pager diff --minimal',
);
