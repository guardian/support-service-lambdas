import { rootCommand } from '../rootCommand.js';

export default rootCommand(
	'git-diff-staged',
	'Git',
	'git --no-pager diff --staged --minimal',
);
