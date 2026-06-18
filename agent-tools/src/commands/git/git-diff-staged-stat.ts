import { rootCommand } from '../rootCommand.js';

export default rootCommand(
	'git-diff-staged-stat',
	'Git',
	'git --no-pager diff --staged --stat',
);
