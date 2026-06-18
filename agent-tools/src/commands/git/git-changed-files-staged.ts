import { rootCommand } from '../rootCommand.js';

export default rootCommand(
	'git-changed-files-staged',
	'Git',
	'git --no-pager diff --staged --name-only',
);
