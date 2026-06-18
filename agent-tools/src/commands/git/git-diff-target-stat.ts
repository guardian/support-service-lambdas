import { rootPathCommand } from '../rootCommand.js';

export default rootPathCommand(
	'git-diff-target-stat',
	'git --no-pager diff --stat',
);
