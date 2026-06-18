import { rootTargetCommand } from '../rootCommand.js';

export default rootTargetCommand(
	'git-diff-target-stat',
	'Git',
	'git --no-pager diff --stat',
);
