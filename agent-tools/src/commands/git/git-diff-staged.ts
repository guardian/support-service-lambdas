import { rootCommand } from '../rootCommand.js';

export default rootCommand(
	'git-diff-staged',
	'git --no-pager diff --staged --minimal',
);
