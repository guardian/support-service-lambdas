import { rootCommand } from '../rootCommand.js';

export default rootCommand(
	'git-diff-stat',
	'Git',
	'git --no-pager diff --stat',
);
